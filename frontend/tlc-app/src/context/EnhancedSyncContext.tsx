import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { syncPendingRecords, getSyncStats, type ConflictResolutionStrategy } from '../services/advancedSyncService';
import { preloadMasterData } from '../services/masterDataCacheService';
import { getLocalDataStats, getConflictedRecords } from '../services/transactionalDataService';

interface ConflictedRecord {
  id: string;
  entityType: string;
  lastError?: string;
}

interface ConflictedRecordSource {
  id: string;
  entityType: string;
  lastError?: string;
}

interface EnhancedSyncContextValue {
  // Sync status
  isSyncing: boolean;
  lastSyncTime?: number;
  lastSyncError?: string;

  // Statistics
  stats: {
    pending: number;
    syncing: number;
    conflicts: number;
    failed: number;
  };

  // Local data info
  localData: {
    totalRecords: number;
    byType: Record<string, number>;
    lastUpdated: number;
  };

  // Conflicted records
  conflictedRecords: ConflictedRecord[];

  // Master data freshness
  masterDataFresh: boolean;

  // Actions
  sync: () => Promise<void>;
  refreshMasterData: () => Promise<void>;
  resolveConflict: (recordId: string, resolution: ConflictResolutionStrategy) => Promise<void>;
}

const EnhancedSyncContext = createContext<EnhancedSyncContextValue>({
  isSyncing: false,
  stats: { pending: 0, syncing: 0, conflicts: 0, failed: 0 },
  localData: { totalRecords: 0, byType: {}, lastUpdated: 0 },
  conflictedRecords: [],
  masterDataFresh: false,
  sync: async () => {},
  refreshMasterData: async () => {},
  resolveConflict: async () => {},
});

export const EnhancedSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>();
  const [lastSyncError, setLastSyncError] = useState<string>();
  const [stats, setStats] = useState({ pending: 0, syncing: 0, conflicts: 0, failed: 0 });
  const [localData, setLocalData] = useState({ totalRecords: 0, byType: {}, lastUpdated: 0 });
  const [conflictedRecords, setConflictedRecords] = useState<ConflictedRecord[]>([]);
  const [masterDataFresh, setMasterDataFresh] = useState(false);

  // Refresh stats
  const refreshStats = useCallback(async () => {
    try {
      const newStats = await getSyncStats();
      setStats(newStats);

      const dataStats = await getLocalDataStats();
      setLocalData({
        totalRecords: dataStats.totalRecords,
        byType: dataStats.byType,
        lastUpdated: dataStats.lastUpdated,
      });

      const conflicts = await getConflictedRecords();
      setConflictedRecords(
        conflicts.map((c: ConflictedRecordSource): ConflictedRecord => ({
          id: c.id,
          entityType: c.entityType,
          lastError: c.lastError,
        }))
      );
    } catch (error) {
      console.error('[EnhancedSyncContext] Error refreshing stats:', error);
    }
  }, []);

  // Perform sync
  const sync = useCallback(async () => {
    if (!navigator.onLine) {
      console.log('[EnhancedSyncContext] Offline - skipping sync');
      return;
    }

    setIsSyncing(true);
    setLastSyncError(undefined);

    try {
      await syncPendingRecords();
      setLastSyncTime(Date.now());
      await refreshStats();
      console.log('[EnhancedSyncContext] ✓ Sync complete');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      setLastSyncError(message);
      console.error('[EnhancedSyncContext] ✗ Sync error:', message);
    } finally {
      setIsSyncing(false);
    }
  }, [refreshStats]);

  // Refresh master data
  const refreshMasterData = useCallback(async () => {
    try {
      if (!navigator.onLine) {
        console.log('[EnhancedSyncContext] Offline - cannot refresh master data');
        return;
      }

      const result = await preloadMasterData();
      setMasterDataFresh(result.failed === 0);
      console.log('[EnhancedSyncContext] Master data refresh complete');
    } catch (error) {
      console.error('[EnhancedSyncContext] Error refreshing master data:', error);
      setMasterDataFresh(false);
    }
  }, []);

  // Resolve conflict (placeholder for now)
  const resolveConflict = useCallback(
    async (recordId: string, resolution: ConflictResolutionStrategy) => {
      console.log(`[EnhancedSyncContext] Resolving conflict for ${recordId} with ${resolution}`);
      // This will be implemented based on specific conflict resolution logic
      await refreshStats();
    },
    [refreshStats]
  );

  // Initialize on mount
  useEffect(() => {
    refreshStats();
    refreshMasterData();

    // Sync on online
    const onOnline = () => {
      console.log('[EnhancedSyncContext] Device online - syncing...');
      sync();
    };

    window.addEventListener('online', onOnline);

    // Periodic refresh of stats
    const statsInterval = setInterval(refreshStats, 30000); // Every 30 seconds

    // Periodic sync when online
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        sync();
      }
    }, 60000); // Every 60 seconds

    return () => {
      window.removeEventListener('online', onOnline);
      clearInterval(statsInterval);
      clearInterval(syncInterval);
    };
  }, [sync, refreshStats, refreshMasterData]);

  return React.createElement(
    EnhancedSyncContext.Provider,
    {
      value: {
        isSyncing,
        lastSyncTime,
        lastSyncError,
        stats,
        localData,
        conflictedRecords,
        masterDataFresh,
        sync,
        refreshMasterData,
        resolveConflict,
      },
    },
    children
  );
};

export const useEnhancedSync = () => useContext(EnhancedSyncContext);
