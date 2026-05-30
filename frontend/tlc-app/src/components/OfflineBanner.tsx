import React from 'react';
import { Alert } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <Alert
      icon={<WifiOffIcon fontSize="small" />}
      severity="warning"
      sx={{
        borderRadius: 0,
        py: 0.5,
        '& .MuiAlert-message': { fontSize: '0.82rem' },
      }}
    >
      You are offline — attendance will be saved locally and synced when reconnected.
    </Alert>
  );
};

export default OfflineBanner;
