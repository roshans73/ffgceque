import React, { useEffect, useState } from 'react';
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
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Add as AddIcon, Upload as UploadIcon } from '@mui/icons-material';
import apiClient from '../services/apiClient';
import type { Coach, District, Block } from '../types';
import BulkUploadDialog from '../components/BulkUploadDialog';

const CoachesPage: React.FC = () => {
  const [coaches,       setCoaches]       = useState<Coach[]>([]);
  const [districts,     setDistricts]     = useState<District[]>([]);
  const [filterBlocks,  setFilterBlocks]  = useState<Block[]>([]);
  const [formBlocks,    setFormBlocks]    = useState<Block[]>([]);
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterBlock,    setFilterBlock]    = useState('');
  const [loading,       setLoading]       = useState(true);

  // Add dialog
  const [addOpen,  setAddOpen]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ districtId: '', blockId: '', empNo: '', name: '' });

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    apiClient.getDistricts().then((r) => setDistricts(r.data)).catch(console.error);
  }, []);

  useEffect(() => { loadCoaches(); }, [filterDistrict, filterBlock]);

  const loadCoaches = async () => {
    setLoading(true);
    try {
      const r = await apiClient.getCoaches(
        filterDistrict ? Number(filterDistrict) : undefined,
        filterBlock    ? Number(filterBlock)    : undefined,
      );
      setCoaches(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleFilterDistrictChange = async (e: SelectChangeEvent) => {
    setFilterDistrict(e.target.value);
    setFilterBlock('');
    if (e.target.value) {
      const r = await apiClient.getBlocks(Number(e.target.value));
      setFilterBlocks(r.data);
    } else {
      setFilterBlocks([]);
    }
  };

  const handleFormDistrictChange = async (e: SelectChangeEvent) => {
    setForm((p) => ({ ...p, districtId: e.target.value, blockId: '' }));
    if (e.target.value) {
      const r = await apiClient.getBlocks(Number(e.target.value));
      setFormBlocks(r.data);
    } else {
      setFormBlocks([]);
    }
  };

  const openAdd = () => {
    setForm({ districtId: '', blockId: '', empNo: '', name: '' });
    setFormError('');
    setFormBlocks([]);
    setAddOpen(true);
  };

  const handleSave = async () => {
    if (!form.districtId || !form.blockId || !form.empNo.trim() || !form.name.trim()) {
      setFormError('All fields are required');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await apiClient.createCoach({
        districtId: Number(form.districtId),
        blockId:    Number(form.blockId),
        empNo:      form.empNo.trim(),
        name:       form.name.trim(),
      });
      setAddOpen(false);
      loadCoaches();
    } catch {
      setFormError('Failed to save coach. Check that the Employee No is not already registered.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Coaches</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage coach records — add individually or import from Excel
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => setUploadOpen(true)}>
            Upload Excel
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Coach
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>District</InputLabel>
          <Select value={filterDistrict} label="District" onChange={handleFilterDistrictChange}>
            <MenuItem value="">All Districts</MenuItem>
            {districts.map((d) => (
              <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {filterDistrict && (
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Block</InputLabel>
            <Select value={filterBlock} label="Block" onChange={(e: SelectChangeEvent) => setFilterBlock(e.target.value)}>
              <MenuItem value="">All Blocks</MenuItem>
              {filterBlocks.map((b) => (
                <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                <TableCell>Emp No</TableCell>
                <TableCell>Name</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {coaches.map((c) => (
                <TableRow key={c.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell>{c.empNo}</TableCell>
                  <TableCell>{c.name}</TableCell>
                </TableRow>
              ))}
              {coaches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No coaches found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Add Coach dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Add Coach</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <FormControl fullWidth required>
              <InputLabel>District</InputLabel>
              <Select value={form.districtId} label="District" onChange={handleFormDistrictChange}>
                {districts.map((d) => (
                  <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Block</InputLabel>
              <Select
                value={form.blockId}
                label="Block"
                disabled={!form.districtId}
                onChange={(e: SelectChangeEvent) => setForm((p) => ({ ...p, blockId: e.target.value }))}
              >
                {formBlocks.map((b) => (
                  <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Employee No"
              value={form.empNo}
              onChange={(e) => setForm((p) => ({ ...p, empNo: e.target.value }))}
              fullWidth required
            />
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth required
            />
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Bulk Upload dialog ── */}
      <BulkUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Coaches"
        columnHint="DistrictId · BlockId · EmpNo · Name"
        onUpload={(file) => apiClient.uploadCoaches(file)}
        onSuccess={loadCoaches}
      />
    </Box>
  );
};

export default CoachesPage;
