import { enhancedDb, getOrCreateDeviceId, type TransactionalRecord } from '../db/enhancedDb';
import { queueForSync } from './advancedSyncService';

/**
 * Create a new transactional record
 * Generates client-side ID if creating offline
 */
export async function createTransactionalRecord(
  entityType: 'attendance' | 'tlc' | 'masterclass' | 'teacher' | 'tlcGroup',
  data: Record<string, unknown>,
  userId: number,
  priority: number = 2
): Promise<TransactionalRecord> {
  const deviceId = await getOrCreateDeviceId();
  const now = Date.now();

  // Generate unique client ID
  const clientId = `${deviceId}_${entityType}_${now}_${Math.random().toString(36).substr(2, 9)}`;

  const record: TransactionalRecord = {
    id: clientId,
    entityType,
    data,
    syncStatus: 'pending',
    attempts: 0,
    clientVersion: 1,
    createdAt: now,
    updatedAt: now,
    deviceId,
    userId,
  };

  await enhancedDb.transactionalRecords.add(record);

  // Queue for sync
  await queueForSync(clientId, 'create', entityType, priority);

  console.log(`[TransactionData] Created offline record: ${clientId}`);

  return record;
}

/**
 * Update a transactional record
 */
export async function updateTransactionalRecord(
  recordId: string,
  updates: Partial<Record<string, unknown>>,
  priority: number = 2
): Promise<TransactionalRecord> {
  const record = await enhancedDb.transactionalRecords.get(recordId);

  if (!record) {
    throw new Error(`Record not found: ${recordId}`);
  }

  const updatedData = {
    ...record.data,
    ...updates,
  };

  const updatedRecord: TransactionalRecord = {
    ...record,
    data: updatedData,
    clientVersion: record.clientVersion + 1,
    updatedAt: Date.now(),
    syncStatus: 'pending', // Mark as pending again after update
  };

  await enhancedDb.transactionalRecords.put(updatedRecord);

  // Queue for sync
  const operation = record.serverId ? 'update' : 'create';
  await queueForSync(recordId, operation, record.entityType, priority);

  console.log(`[TransactionData] Updated record: ${recordId}, version: ${updatedRecord.clientVersion}`);

  return updatedRecord;
}

/**
 * Delete a transactional record
 */
export async function deleteTransactionalRecord(recordId: string, priority: number = 1): Promise<void> {
  const record = await enhancedDb.transactionalRecords.get(recordId) as any;

  if (!record) {
    throw new Error(`Record not found: ${recordId}`);
  }

  if (record.serverId) {
    // If synced to server, mark for deletion sync
    await enhancedDb.transactionalRecords.update(recordId, {
      syncStatus: 'pending',
    });

    await queueForSync(recordId, 'delete', record.entityType, priority);
  } else {
    // If not yet synced, just delete locally
    await enhancedDb.transactionalRecords.delete(recordId);
  }

  console.log(`[TransactionData] Deleted record: ${recordId}`);
}

/**
 * Get a specific record
 */
export async function getTransactionalRecord(recordId: string): Promise<TransactionalRecord | undefined> {
  return enhancedDb.transactionalRecords.get(recordId);
}

/**
 * Get all records of a specific type
 */
export async function getRecordsByType(
  entityType: 'attendance' | 'tlc' | 'masterclass' | 'teacher' | 'tlcGroup'
): Promise<TransactionalRecord[]> {
  return enhancedDb.transactionalRecords.where('entityType').equals(entityType).toArray();
}

/**
 * Get all records for a specific user
 */
export async function getUserRecords(userId: number): Promise<TransactionalRecord[]> {
  return enhancedDb.transactionalRecords.where('userId').equals(userId).toArray();
}

/**
 * Get records by sync status
 */
export async function getRecordsByStatus(
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed'
): Promise<TransactionalRecord[]> {
  return enhancedDb.transactionalRecords.where('syncStatus').equals(status).toArray();
}

/**
 * Get conflicted records that need manual review
 */
export async function getConflictedRecords(): Promise<TransactionalRecord[]> {
  return enhancedDb.transactionalRecords.where('syncStatus').equals('conflict').toArray();
}

/**
 * Get failed records for retry
 */
export async function getFailedRecords(): Promise<TransactionalRecord[]> {
  return enhancedDb.transactionalRecords
    .where('syncStatus')
    .equals('failed')
    .and((record: any): boolean => (record.attempts || 0) < 5)
    .toArray();
}

/**
 * Get all pending operations (pending, syncing, or failed)
 */
export async function getPendingOperations(): Promise<TransactionalRecord[]> {
  const records = await enhancedDb.transactionalRecords.toArray();
  return records.filter((r: any) => 
    r.syncStatus === 'pending' || r.syncStatus === 'syncing' || r.syncStatus === 'failed'
  );
}

/**
 * Get records created since a specific timestamp
 * Useful for finding recent changes for diff
 */
export async function getRecordsSince(timestamp: number): Promise<TransactionalRecord[]> {
  return enhancedDb.transactionalRecords
    .where('updatedAt')
    .above(timestamp)
    .toArray();
}

/**
 * Get records by multiple criteria
 */
export async function queryRecords(filter: {
  entityType?: string;
  userId?: number;
  syncStatus?: string;
  createdAfter?: number;
  createdBefore?: number;
}): Promise<TransactionalRecord[]> {
  let query = enhancedDb.transactionalRecords.toCollection();

  if (filter.entityType) {
    query = query.filter((r: any): boolean => r.entityType === filter.entityType);
  }

  if (filter.userId) {
    query = query.filter((r: any): boolean => r.userId === filter.userId);
  }

  if (filter.syncStatus) {
    query = query.filter((r: any): boolean => r.syncStatus === filter.syncStatus);
  }

  if (filter.createdAfter) {
    query = query.filter((r: any): boolean => r.createdAt >= filter.createdAfter!);
  }

  if (filter.createdBefore) {
    query = query.filter((r: any): boolean => r.createdAt <= filter.createdBefore!);
  }

  return query.toArray();
}

/**
 * Batch create multiple records
 */
export async function batchCreateRecords(
  records: Array<{
    entityType: 'attendance' | 'tlc' | 'masterclass' | 'teacher' | 'tlcGroup';
    data: Record<string, unknown>;
    userId: number;
  }>,
  priority: number = 2
): Promise<TransactionalRecord[]> {
  const created: TransactionalRecord[] = [];

  for (const record of records) {
    const created_record = await createTransactionalRecord(
      record.entityType,
      record.data,
      record.userId,
      priority
    );
    created.push(created_record);
  }

  console.log(`[TransactionData] Batch created ${created.length} records`);

  return created;
}

/**
 * Get statistics on local data
 */
export async function getLocalDataStats(): Promise<{
  totalRecords: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  lastUpdated: number;
}> {
  const records = await enhancedDb.transactionalRecords.toArray();

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  records.forEach((record: any): void => {
    byType[record.entityType] = (byType[record.entityType] || 0) + 1;
    byStatus[record.syncStatus] = (byStatus[record.syncStatus] || 0) + 1;
  });

  const lastUpdated = records.length > 0 ? Math.max(...records.map((r: any): number => r.updatedAt)) : 0;

  return {
    totalRecords: records.length,
    byType,
    byStatus,
    lastUpdated,
  };
}

/**
 * Export all local data for backup
 */
export async function exportLocalData(): Promise<{
  records: TransactionalRecord[];
  exportedAt: number;
  deviceId: string;
}> {
  const deviceId = await getOrCreateDeviceId();
  const records = await enhancedDb.transactionalRecords.toArray();

  return {
    records,
    exportedAt: Date.now(),
    deviceId,
  };
}

/**
 * Import data from backup
 * Useful for data recovery or migration
 */
export async function importLocalData(backup: {
  records: TransactionalRecord[];
  deviceId: string;
}): Promise<number> {
  let imported = 0;

  for (const record of backup.records) {
    try {
      const existing = await enhancedDb.transactionalRecords.get(record.id) as any;

      if (!existing) {
        await enhancedDb.transactionalRecords.add(record);
        imported++;
      }
    } catch (error) {
      console.error(`[TransactionData] Error importing record ${record.id}:`, error);
    }
  }

  console.log(`[TransactionData] Imported ${imported} records from backup`);

  return imported;
}

/**
 * Clear all local transactional data (use with caution!)
 */
export async function clearLocalData(): Promise<void> {
  const recordIds = (await enhancedDb.transactionalRecords.toCollection().keys()) as string[];
  await enhancedDb.transactionalRecords.bulkDelete(recordIds);
  console.log('[TransactionData] All local data cleared');
}

/**
 * Remove synced records to free up storage
 */
export async function cleanupSyncedRecords(keepDays: number = 30): Promise<number> {
  const cutoffTime = Date.now() - keepDays * 24 * 60 * 60 * 1000;

  const syncedRecords = await enhancedDb.transactionalRecords
    .where('syncStatus')
    .equals('synced')
    .and((record: any): boolean => record.updatedAt < cutoffTime)
    .toArray();

  const ids = syncedRecords.map((r: any): string => r.id);
  await enhancedDb.transactionalRecords.bulkDelete(ids);

  console.log(`[TransactionData] Cleaned up ${ids.length} old synced records`);

  return ids.length;
}
