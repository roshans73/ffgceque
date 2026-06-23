import Dexie, { type Table } from 'dexie';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface MasterDataEntry {
  key: string;
  data: unknown;
  cachedAt: number;
}

export interface PendingAttendance {
  id: string;
  type: 'tlc' | 'masterclass';
  payload: unknown;
  createdAt: number;
  syncStatus: SyncStatus;
  attempts: number;
  lastError?: string;
}

class LocalDb extends Dexie {
  masterDataCache!: Table<MasterDataEntry, string>;
  pendingAttendance!: Table<PendingAttendance, string>;

  constructor() {
    super('tlc_offline_db');
    this.version(1).stores({
      masterDataCache: 'key, cachedAt',
      pendingAttendance: 'id, type, syncStatus, createdAt',
    });
  }
}

export const db = new LocalDb();
