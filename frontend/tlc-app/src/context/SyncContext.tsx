import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { syncPendingRecords, getPendingCount } from '../services/syncService';

interface SyncContextValue {
  pendingCount: number;
  sync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue>({
  pendingCount: 0,
  sync: async () => {},
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const sync = useCallback(async () => {
    await syncPendingRecords();
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    const onOnline = () => sync();
    window.addEventListener('online', onOnline);
    const interval = setInterval(refresh, 15_000);
    return () => {
      window.removeEventListener('online', onOnline);
      clearInterval(interval);
    };
  }, [sync, refresh]);

  return (
    <SyncContext.Provider value={{ pendingCount, sync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
