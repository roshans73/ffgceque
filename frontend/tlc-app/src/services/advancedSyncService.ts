import apiClient from './apiClient';
import {
  detectConflict,
  resolveConflict,
  determineStrategy,
  getConflictDescription,
  type ConflictResolutionStrategy,
} from './conflictResolutionService';
import { enhancedDb, getOrCreateDeviceId, type SyncQueueItem, type TransactionalRecord } from '../db/enhancedDb';

// Re-export ConflictResolutionStrategy for consumers
export type { ConflictResolutionStrategy };

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const PRIORITY_HIGH = 1;
const PRIORITY_MEDIUM = 2;
// PRIORITY_LOW = 3 - not used, using only HIGH and MEDIUM priorities

/**
 * Add a record to the sync queue
 */
export async function queueForSync(
  recordId: string,
  operation: 'create' | 'update' | 'delete',
  entityType: string,
  priority: number = PRIORITY_MEDIUM
): Promise<void> {
  const queueId = `${operation}_${recordId}_${Date.now()}`;

  const queueItem: SyncQueueItem = {
    id: queueId,
    recordId,
    operation,
    entityType,
    priority,
    createdAt: Date.now(),
    attempts: 0,
    maxRetries: MAX_RETRIES,
  };

  await enhancedDb.syncQueue.add(queueItem);
  console.log(`[SyncQueue] Added ${operation} of ${entityType}:${recordId}`);
}

/**
 * Get pending queue items sorted by priority
 */
export async function getPendingQueue(limit: number = 10): Promise<SyncQueueItem[]> {
  const now = Date.now();

  const items = await enhancedDb.syncQueue
    .where('nextRetryAt')
    .below(now + 1) // Include items with no retry time set
    .toArray();

  // Also check items that haven't been retried yet
  const newItems = await enhancedDb.syncQueue.where('attempts').equals(0).toArray();

  const combined = [...new Map([...items, ...newItems].map(item => [item.id, item])).values()];

  return combined.sort((a, b) => a.priority - b.priority).slice(0, limit);
}

/**
 * Process a single sync queue item
 */
export async function processSyncQueueItem(queueItem: SyncQueueItem): Promise<boolean> {
  try {
    const record = await enhancedDb.transactionalRecords.get(queueItem.recordId);

    if (!record) {
      console.warn(`[Sync] Record not found: ${queueItem.recordId}`);
      await enhancedDb.syncQueue.delete(queueItem.id);
      return false;
    }

    // Update queue item status
    await enhancedDb.syncQueue.update(queueItem.id, {
      attempts: queueItem.attempts + 1,
    });

    // Update record to syncing status
    await enhancedDb.transactionalRecords.update(record.id, {
      syncStatus: 'syncing',
      lastSyncAttempt: Date.now(),
    });

    const deviceId = await getOrCreateDeviceId();
    let success = false;

    switch (queueItem.operation) {
      case 'create':
        success = await syncCreate(record, deviceId);
        break;
      case 'update':
        success = await syncUpdate(record, deviceId);
        break;
      case 'delete':
        success = await syncDelete(record, deviceId);
        break;
    }

    if (success) {
      await enhancedDb.syncQueue.delete(queueItem.id);
      console.log(`[Sync] ✓ Successfully synced ${queueItem.operation} of ${queueItem.entityType}`);
    } else {
      // Schedule retry with exponential backoff
      const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, queueItem.attempts - 1), MAX_RETRY_DELAY);
      const nextRetryAt = Date.now() + delay;

      await enhancedDb.syncQueue.update(queueItem.id, {
        nextRetryAt,
      });

      console.log(`[Sync] Retry scheduled in ${delay}ms for ${queueItem.recordId}`);
    }

    return success;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Sync] Error processing queue item:`, message);

    // Update queue with error and schedule retry
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, Math.min(queueItem.attempts, 3)),
      MAX_RETRY_DELAY
    );

    await enhancedDb.syncQueue.update(queueItem.id, {
      lastError: message,
      nextRetryAt: Date.now() + delay,
    });

    return false;
  }
}

/**
 * Sync record creation to server
 */
async function syncCreate(record: TransactionalRecord, deviceId: string): Promise<boolean> {
  try {
    let response: any;

    switch (record.entityType) {
      case 'attendance':
        response = await apiClient.recordTLCAttendance(record.data);
        break;
      case 'tlc':
        response = await apiClient.createTLC(record.data);
        break;
      case 'teacher':
        response = await apiClient.createTeacher(record.data);
        break;
      default:
        throw new Error(`Unsupported entity type: ${record.entityType}`);
    }

    const serverId = response.data?.id;

    if (serverId) {
      // Mark as synced and store server ID
      await enhancedDb.transactionalRecords.update(record.id, {
        syncStatus: 'synced',
        serverId,
        serverVersion: response.data?.version || 1,
      });

      // Record successful sync
      await recordSyncHistory(
        record.id,
        'create',
        'success',
        record.data,
        response.data,
        'clientWins',
        deviceId
      );

      return true;
    }

    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    console.error(`[Sync] Create failed:`, message);

    await enhancedDb.transactionalRecords.update(record.id, {
      syncStatus: 'failed',
      lastError: message,
    });

    return false;
  }
}

/**
 * Sync record update to server with conflict detection
 */
async function syncUpdate(record: TransactionalRecord, deviceId: string): Promise<boolean> {
  try {
    if (!record.serverId) {
      throw new Error('No serverId found. Use create sync first.');
    }

    // Fetch latest server version
    let serverData: any;
    try {
      const response = await apiClient.getRecord(record.entityType, record.serverId);
      serverData = response.data;
    } catch {
      // If record doesn't exist on server, create it instead
      return syncCreate(record, deviceId);
    }

    // Check for conflicts
    const conflict = detectConflict(record, serverData);

    if (conflict.hasConflict) {
      console.warn(`[Sync] Conflict detected for ${record.entityType}:${record.serverId}`);

      // Determine resolution strategy
      const conflictAge = Date.now() - (record.updatedAt || record.createdAt);
      const strategy = determineStrategy(record.entityType, 'update', conflictAge);

      // Resolve conflict
      const resolution = resolveConflict(
        record.data,
        serverData,
        strategy,
        record.updatedAt,
        serverData.updatedAt
      );

      if (resolution.requiresManualReview) {
        // Mark as conflict - user will need to review
        await enhancedDb.transactionalRecords.update(record.id, {
          syncStatus: 'conflict',
          lastError: getConflictDescription(record.data, serverData, record.entityType),
        });

        await recordSyncHistory(
          record.id,
          'update',
          'conflict',
          record.data,
          serverData,
          'merged',
          deviceId
        );

        return false; // User needs to review
      }

      // Auto-resolve conflict
      const mergedData = resolution.mergedData;

      // Send merged data to server
      await apiClient.updateRecord(record.entityType, record.serverId, mergedData);

      await enhancedDb.transactionalRecords.update(record.id, {
        syncStatus: 'synced',
        data: mergedData,
        clientVersion: record.clientVersion + 1,
        serverVersion: serverData.version + 1,
      });

      await recordSyncHistory(
        record.id,
        'update',
        'success',
        record.data,
        mergedData,
        resolution.strategy,
        deviceId
      );

      return true;
    }

    // No conflict - proceed with update
    await apiClient.updateRecord(record.entityType, record.serverId, record.data);

    await enhancedDb.transactionalRecords.update(record.id, {
      syncStatus: 'synced',
      clientVersion: record.clientVersion + 1,
      serverVersion: serverData.version + 1,
    });

    await recordSyncHistory(
      record.id,
      'update',
      'success',
      record.data,
      serverData,
      'clientWins',
      deviceId
    );

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    console.error(`[Sync] Update failed:`, message);

    await enhancedDb.transactionalRecords.update(record.id, {
      syncStatus: 'failed',
      lastError: message,
    });

    return false;
  }
}

/**
 * Sync record deletion to server
 */
async function syncDelete(record: TransactionalRecord, deviceId: string): Promise<boolean> {
  try {
    if (!record.serverId) {
      // Already deleted locally, just remove from queue
      await enhancedDb.transactionalRecords.delete(record.id);
      return true;
    }

    await apiClient.deleteRecord(record.entityType, record.serverId);

    await enhancedDb.transactionalRecords.delete(record.id);

    await recordSyncHistory(
      record.id,
      'delete',
      'success',
      record.data,
      undefined,
      'clientWins',
      deviceId
    );

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    console.error(`[Sync] Delete failed:`, message);

    await enhancedDb.transactionalRecords.update(record.id, {
      syncStatus: 'failed',
      lastError: message,
    });

    return false;
  }
}

/**
 * Record sync operation in history for audit trail
 */
async function recordSyncHistory(
  recordId: string,
  operation: 'create' | 'update' | 'delete',
  status: 'success' | 'failed' | 'conflict',
  clientData: Record<string, unknown> | undefined,
  serverData: Record<string, unknown> | undefined,
  resolution: string,
  deviceId: string
): Promise<void> {
  const userId = parseInt(localStorage.getItem('userId') || '0');

  await enhancedDb.syncHistory.add({
    id: `${recordId}_${Date.now()}`,
    recordId,
    operation,
    status,
    clientData,
    serverData,
    conflictResolution: resolution as 'clientWins' | 'serverWins' | 'merged',
    syncedAt: Date.now(),
    deviceId,
    userId,
  });
}

/**
 * Main sync orchestrator - syncs pending queue items
 */
export async function syncPendingRecords(): Promise<{
  synced: number;
  failed: number;
  conflicts: number;
}> {
  if (!navigator.onLine) {
    console.log('[Sync] Offline - skipping sync');
    return { synced: 0, failed: 0, conflicts: 0 };
  }

  console.log('[Sync] Starting sync process...');

  const stats = { synced: 0, failed: 0, conflicts: 0 };
  const pending = await getPendingQueue(10);

  if (pending.length === 0) {
    console.log('[Sync] No pending records to sync');
    return stats;
  }

  for (const item of pending) {
    const success = await processSyncQueueItem(item);
    if (success) {
      stats.synced++;
    } else {
      const record = await enhancedDb.transactionalRecords.get(item.recordId);
      if (record?.syncStatus === 'conflict') {
        stats.conflicts++;
      } else {
        stats.failed++;
      }
    }
  }

  console.log(`[Sync] Complete: ${stats.synced} synced, ${stats.failed} failed, ${stats.conflicts} conflicts`);

  return stats;
}

/**
 * Get count of records in various sync states
 */
export async function getSyncStats(): Promise<{
  pending: number;
  syncing: number;
  conflicts: number;
  failed: number;
}> {
  const records = (await enhancedDb.transactionalRecords.toArray()) as any[];

  return {
    pending: records.filter((r: any): boolean => r.syncStatus === 'pending').length,
    syncing: records.filter((r: any): boolean => r.syncStatus === 'syncing').length,
    conflicts: records.filter((r: any): boolean => r.syncStatus === 'conflict').length,
    failed: records.filter((r: any): boolean => r.syncStatus === 'failed').length,
  };
}

/**
 * Force sync a specific record (manual override)
 */
export async function forceSyncRecord(recordId: string): Promise<boolean> {
  const record = await enhancedDb.transactionalRecords.get(recordId);

  if (!record) {
    throw new Error(`Record not found: ${recordId}`);
  }

  const operation = record.serverId ? 'update' : 'create';
  await queueForSync(recordId, operation as any, record.entityType, PRIORITY_HIGH);

  return syncPendingRecords().then(stats => stats.synced > 0);
}

/**
 * Resolve a conflict manually
 */
export async function resolveConflictManually(
  recordId: string,
  resolvedData: Record<string, unknown>
): Promise<void> {
  const record = await enhancedDb.transactionalRecords.get(recordId);

  if (!record) {
    throw new Error(`Record not found: ${recordId}`);
  }

  await enhancedDb.transactionalRecords.update(recordId, {
    data: resolvedData,
    syncStatus: 'pending',
    isResolved: true,
  });

  await queueForSync(recordId, 'update', record.entityType, PRIORITY_HIGH);
}
