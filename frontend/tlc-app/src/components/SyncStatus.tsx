import React, { useState } from 'react';
import { Chip, CircularProgress, Tooltip } from '@mui/material';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSync } from '../context/SyncContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const SyncStatus: React.FC = () => {
  const { pendingCount, sync } = useSync();
  const isOnline = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    await sync();
    setSyncing(false);
  };

  if (pendingCount === 0) {
    return (
      <Tooltip title="All records synced">
        <CheckCircleIcon sx={{ color: '#4caf50', fontSize: '1.2rem', mx: 1 }} />
      </Tooltip>
    );
  }

  return (
    <Tooltip
      title={
        isOnline
          ? `Tap to sync ${pendingCount} pending record(s)`
          : `${pendingCount} record(s) waiting for connection`
      }
    >
      <Chip
        icon={
          syncing ? (
            <CircularProgress size={14} color="inherit" />
          ) : (
            <CloudSyncIcon />
          )
        }
        label={pendingCount}
        size="small"
        onClick={handleSync}
        sx={{
          bgcolor: '#f59e0b',
          color: '#0f2044',
          fontWeight: 700,
          fontSize: '0.75rem',
          height: 24,
          cursor: isOnline ? 'pointer' : 'default',
          mx: 1,
          '& .MuiChip-icon': { color: '#0f2044', fontSize: '1rem' },
        }}
      />
    </Tooltip>
  );
};

export default SyncStatus;
