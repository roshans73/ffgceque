import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import apiClient from '../services/apiClient';
import type { BulkUploadResponse } from '../types';

const UploadTLCGroupsPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkUploadResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const r = await apiClient.uploadTLCGroups(file);
      setResult(r.data);
    } catch {
      setResult({ success: false, successCount: 0, errorCount: 1, errors: ['Upload failed'], message: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Upload TLC Groups
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Upload an Excel (.xlsx) file with columns: DistrictId, BlockId, Location, DateFormed, GroupShortForm, TeacherLeaderId
      </Typography>

      <Paper sx={{ p: 3, mb: 3, maxWidth: 500 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
            Choose File
            <input type="file" accept=".xlsx" hidden onChange={handleFileChange} />
          </Button>
          {file && <Typography variant="body2">Selected: {file.name}</Typography>}
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!file || uploading}
            startIcon={uploading ? <CircularProgress size={16} /> : undefined}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </Box>
      </Paper>

      {result && (
        <Box sx={{ maxWidth: 500 }}>
          <Alert severity={result.success ? 'success' : 'warning'} sx={{ mb: 2 }}>
            {result.message} — {result.successCount} imported, {result.errorCount} errors
          </Alert>
          {result.errors.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Errors:</Typography>
              <List dense>
                {result.errors.map((e, i) => (
                  <ListItem key={i} disableGutters>
                    <ListItemText primary={e} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default UploadTLCGroupsPage;
