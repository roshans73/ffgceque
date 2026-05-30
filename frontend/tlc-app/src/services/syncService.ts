import { db } from '../db/localDb';
import type { PendingAttendance } from '../db/localDb';
import apiClient from './apiClient';

async function syncRecord(record: PendingAttendance): Promise<void> {
  await db.pendingAttendance.update(record.id, { syncStatus: 'syncing' });
  try {
    if (record.type === 'tlc') {
      await apiClient.recordTLCAttendance(record.payload);
    } else {
      await apiClient.recordMasterclassAttendance(record.payload);
    }
    await db.pendingAttendance.update(record.id, { syncStatus: 'synced' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    await db.pendingAttendance.update(record.id, {
      syncStatus: 'failed',
      attempts: record.attempts + 1,
      lastError: message,
    });
  }
}

export async function syncPendingRecords(): Promise<void> {
  if (!navigator.onLine) return;
  const pending = await db.pendingAttendance
    .where('syncStatus')
    .anyOf(['pending', 'failed'])
    .toArray();
  for (const record of pending) {
    await syncRecord(record);
  }
}

export function getPendingCount(): Promise<number> {
  return db.pendingAttendance
    .where('syncStatus')
    .anyOf(['pending', 'failed'])
    .count();
}
