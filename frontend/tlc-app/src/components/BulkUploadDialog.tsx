import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { Upload as UploadIcon, FilePresent as FileIcon } from '@mui/icons-material';
import type { BulkUploadResponse } from '../types';

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** One-line description of expected columns in the Excel file */
  columnHint: string;
  onUpload: (file: File) => Promise<{ data: BulkUploadResponse }>;
  /** Called after a successful upload so the parent can reload its list */
  onSuccess: () => void;
}

const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({
  open,
  onClose,
  title,
  columnHint,
  onUpload,
  onSuccess,
}) => {
  const [file,      setFile]      = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result,    setResult]    = useState<BulkUploadResponse | null>(null);

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const r = await onUpload(file);
      setResult(r.data);
      if (r.data.success) onSuccess();
    } catch {
      setResult({
        success: false,
        successCount: 0,
        errorCount: 1,
        errors: ['Upload failed. Please check the file format and try again.'],
        message: 'Upload failed',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Upload an Excel (.xlsx) file — row 1 is treated as a header and skipped.
        </Typography>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>
        <Box
          sx={{
            bgcolor: 'grey.50',
            border: '1px dashed',
            borderColor: 'grey.300',
            borderRadius: 2,
            p: 2,
            mb: 2.5,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            EXPECTED COLUMNS
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {columnHint}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadIcon />}
            sx={{ flexShrink: 0 }}
          >
            Choose File
            <input type="file" accept=".xlsx" hidden onChange={handleFileChange} />
          </Button>

          {file && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <FileIcon fontSize="small" />
              <Typography variant="body2" noWrap sx={{ maxWidth: 260 }}>
                {file.name}
              </Typography>
            </Box>
          )}
        </Box>

        {result && (
          <Box sx={{ mt: 2.5 }}>
            <Alert
              severity={result.errorCount === 0 ? 'success' : result.successCount > 0 ? 'warning' : 'error'}
              sx={{ mb: result.errors.length > 0 ? 1.5 : 0 }}
            >
              {result.message} — {result.successCount} imported
              {result.errorCount > 0 && `, ${result.errorCount} error${result.errorCount > 1 ? 's' : ''}`}
            </Alert>

            {result.errors.length > 0 && (
              <Box
                sx={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: '1px solid',
                  borderColor: 'error.light',
                  borderRadius: 1,
                  bgcolor: 'error.50',
                }}
              >
                <List dense disablePadding>
                  {result.errors.map((e, i) => (
                    <ListItem key={i} sx={{ py: 0.25 }}>
                      <ListItemText
                        primary={e}
                        slotProps={{ primary: { sx: { fontSize: '0.8rem', color: 'error.dark' } } }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={handleClose}>
          {result?.success ? 'Close' : 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || uploading}
          startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkUploadDialog;
