import Dexie, { type Table } from 'dexie';

// Master Data - Reference data that rarely changes
export interface MasterDataEntry {
  key: string;
  data: unknown;
  version: number; // API version for conflict detection
  eTag?: string; // Entity tag from server
  cachedAt: number;
  expiresAt: number; // Cache expiration timestamp
}

// Transactional Data - User-generated data with full history
export interface TransactionalRecord {
  id: string; // clientId_timestamp format for offline creation
  serverId?: number; // Server ID after sync
  entityType: 'attendance' | 'tlc' | 'masterclass' | 'teacher' | 'tlcGroup';
  data: Record<string, unknown>;
  
  // Sync tracking
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
  attempts: number;
  lastError?: string;
  lastSyncAttempt?: number;
  
  // Versioning for conflict detection
  clientVersion: number; // Version on client
  serverVersion?: number; // Last known server version
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  deviceId: string; // To identify which device made the change
  userId: number;
  
  // For conflict resolution
  conflictWith?: string; // ID of conflicting record
  isResolved?: boolean;
}

// Sync Queue - Tracks operations that need syncing
export interface SyncQueueItem {
  id: string;
  recordId: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  priority: number; // 1=high, 2=medium, 3=low
  createdAt: number;
  attempts: number;
  maxRetries: number;
  nextRetryAt?: number;
  lastError?: string;
}

// Sync History - Audit trail of all sync operations
export interface SyncHistory {
  id: string;
  recordId: string;
  operation: 'create' | 'update' | 'delete';
  status: 'success' | 'failed' | 'conflict';
  clientData?: Record<string, unknown>;
  serverData?: Record<string, unknown>;
  conflictResolution?: 'clientWins' | 'serverWins' | 'merged';
  syncedAt: number;
  deviceId: string;
  userId: number;
}

// Device Info - Track device metadata for sync
export interface DeviceInfo {
  deviceId: string;
  userId: number;
  deviceName: string;
  lastSyncAt?: number;
  lastCheckedAt: number;
  createdAt: number;
}

class EnhancedDb extends Dexie {
  // Master Data
  masterDataCache!: Table<MasterDataEntry, string>;

  // Transactional Data
  transactionalRecords!: Table<TransactionalRecord, string>;

  // Sync management
  syncQueue!: Table<SyncQueueItem, string>;
  syncHistory!: Table<SyncHistory, string>;
  deviceInfo!: Table<DeviceInfo, string>;

  constructor() {
    super('tlc_offline_db_v2');
    (this as Dexie).version(2).stores({
      masterDataCache: 'key, expiresAt',
      transactionalRecords: 'id, serverId, entityType, syncStatus, userId, [userId+entityType]',
      syncQueue: 'id, recordId, priority, nextRetryAt, [userId+operation]',
      syncHistory: 'id, recordId, syncedAt, status, [userId+syncedAt]',
      deviceInfo: 'deviceId, userId, createdAt',
    } as any);
  }
}

export const enhancedDb = new EnhancedDb();

/**
 * Get or create device ID
 */
export async function getOrCreateDeviceId(): Promise<string> {
  let deviceId = localStorage.getItem('deviceId');
  
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('deviceId', deviceId);
  }
  
  return deviceId;
}

/**
 * Initialize device info on app start
 */
export async function initializeDeviceInfo(userId: number, deviceName: string = 'Unknown'): Promise<DeviceInfo> {
  const deviceId = await getOrCreateDeviceId();
  
  let device = await enhancedDb.deviceInfo.get(deviceId);
  
  if (!device) {
    device = {
      deviceId,
      userId,
      deviceName,
      createdAt: Date.now(),
      lastCheckedAt: Date.now(),
    };
    await enhancedDb.deviceInfo.add(device);
  } else {
    device.lastCheckedAt = Date.now();
    await enhancedDb.deviceInfo.update(deviceId, device);
  }
  
  return device;
}
