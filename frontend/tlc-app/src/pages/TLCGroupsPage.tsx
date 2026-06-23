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
import type { TLCGroup, District, Block, Teacher } from '../types';
import BulkUploadDialog from '../components/BulkUploadDialog';

interface TLCGroupForm {
  districtId: string;
  blockId: string;
  location: string;
  dateFormed: string;
  teacherLeaderId: string;
  groupShortForm: string;
}

const EMPTY_FORM: TLCGroupForm = {
  districtId: '', blockId: '', location: '',
  dateFormed: '', teacherLeaderId: '', groupShortForm: '',
};

const TLCGroupsPage: React.FC = () => {
  const [groups,         setGroups]         = useState<TLCGroup[]>([]);
  const [districts,      setDistricts]      = useState<District[]>([]);
  const [filterBlocks,   setFilterBlocks]   = useState<Block[]>([]);
  const [formBlocks,     setFormBlocks]     = useState<Block[]>([]);
  const [teachers,       setTeachers]       = useState<Teacher[]>([]);
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterBlock,    setFilterBlock]    = useState('');
  const [loading,        setLoading]        = useState(true);

  // Add dialog
  const [addOpen,   setAddOpen]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');
  const [form,      setForm]      = useState<TLCGroupForm>(EMPTY_FORM);

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    apiClient.getDistricts().then((r) => setDistricts(r.data)).catch(console.error);
    apiClient.getTeachers().then((r) => setTeachers(r.data)).catch(console.error);
  }, []);

  useEffect(() => { loadGroups(); }, [filterDistrict, filterBlock]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const r = await apiClient.getTLCGroups();
      setGroups(r.data);
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
    setForm(EMPTY_FORM);
    setFormError('');
    setFormBlocks([]);
    setAddOpen(true);
  };

  const handleSave = async () => {
    const { districtId, blockId, location, dateFormed, teacherLeaderId, groupShortForm } = form;
    if (!districtId || !blockId || !location.trim() || !dateFormed || !teacherLeaderId || !groupShortForm.trim()) {
      setFormError('All fields are required');
      return;
    }
    if (groupShortForm.trim().length < 2) {
      setFormError('Group short form must be at least 2 characters');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await apiClient.createTLCGroup({
        districtId:      Number(districtId),
        blockId:         Number(blockId),
        location:        location.trim(),
        dateFormed,
        teacherLeaderId: Number(teacherLeaderId),
        groupShortForm:  groupShortForm.trim().toUpperCase(),
      });
      setAddOpen(false);
      loadGroups();
    } catch {
      setFormError('Failed to save TLC group. The group code may conflict with an existing one.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = groups.filter((g) => {
    if (filterDistrict && g.districtId !== Number(filterDistrict)) return false;
    if (filterBlock    && g.blockId    !== Number(filterBlock))    return false;
    return true;
  });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>TLC Groups</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage TLC group records — add individually or import from Excel
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => setUploadOpen(true)}>
            Upload Excel
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add TLC Group
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
            <Select value={filterBlock} label="Block"
              onChange={(e: SelectChangeEvent) => setFilterBlock(e.target.value)}>
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
                <TableCell>Group Code</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Date Formed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((g) => (
                <TableRow key={g.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{g.tlcGroupCode}</TableCell>
                  <TableCell>{g.location}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {new Date(g.dateFormed).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No TLC groups found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Add TLC Group dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Add TLC Group</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            The group code is auto-generated from the district and short form you enter.
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <Box sx={{ display: 'flex', gap: 2 }}>
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
                <Select value={form.blockId} label="Block" disabled={!form.districtId}
                  onChange={(e: SelectChangeEvent) => setForm((p) => ({ ...p, blockId: e.target.value }))}>
                  {formBlocks.map((b) => (
                    <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Location" value={form.location} required sx={{ flex: 1 }}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
              <TextField
                label="Date Formed"
                type="date"
                value={form.dateFormed}
                required
                sx={{ width: 180 }}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={(e) => setForm((p) => ({ ...p, dateFormed: e.target.value }))}
              />
            </Box>

            <TextField
              label="Group Short Form"
              value={form.groupShortForm}
              required
              placeholder="e.g. AL"
              helperText="2-letter identifier appended to the auto-generated group code"
              onChange={(e) => setForm((p) => ({ ...p, groupShortForm: e.target.value.toUpperCase().slice(0, 4) }))}
              fullWidth
            />

            <FormControl fullWidth required>
              <InputLabel>Teacher Leader</InputLabel>
              <Select value={form.teacherLeaderId} label="Teacher Leader"
                onChange={(e: SelectChangeEvent) => setForm((p) => ({ ...p, teacherLeaderId: e.target.value }))}>
                {teachers.map((t) => (
                  <MenuItem key={t.id} value={String(t.id)}>
                    {t.name} <Typography component="span" sx={{ ml: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
                      {t.teacherCode}
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
        title="Upload TLC Groups"
        columnHint="DistrictId · BlockId · Location · DateFormed · GroupShortForm · TeacherLeaderId"
        onUpload={(file) => apiClient.uploadTLCGroups(file)}
        onSuccess={loadGroups}
      />
    </Box>
  );
};

export default TLCGroupsPage;
