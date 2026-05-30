import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  PersonOff as DeactivateIcon,
  PersonAdd as ActivateIcon,
} from '@mui/icons-material';
import apiClient from '../services/apiClient';
import type { District, Block } from '../types';
import { ROLES, getRoleById } from '../constants/roles';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AppUser {
  id: number;
  name: string;
  email: string;
  roleId: number;
  districtId?: number;
  blockId?: number;
  isActive: boolean;
}

interface UserForm {
  name: string;
  email: string;
  roleId: string;
  districtId: string;
  blockId: string;
  azureAadId: string;
}

const EMPTY_FORM: UserForm = {
  name: '',
  email: '',
  roleId: '',
  districtId: '',
  blockId: '',
  azureAadId: '',
};

// ── Role chip colours ─────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  CEO:                'secondary',
  SustainabilityLead: 'success',
  TechMETeam:         'primary',
  TLCManager:         'info',
};

// ── Component ─────────────────────────────────────────────────────────────────
const UsersPage: React.FC = () => {
  const [users,     setUsers]     = useState<AppUser[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [blocks,    setBlocks]    = useState<Block[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [toggling,  setToggling]  = useState<number | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [form,       setForm]       = useState<UserForm>(EMPTY_FORM);
  const [formError,  setFormError]  = useState('');

  // ── Data loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    apiClient.getDistricts().then((r) => setDistricts(r.data)).catch(console.error);
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const r = await apiClient.getUsers();
      setUsers(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadBlocks = async (districtId: string) => {
    if (!districtId) { setBlocks([]); return; }
    try {
      const r = await apiClient.getBlocks(Number(districtId));
      setBlocks(r.data);
    } catch (e) {
      console.error(e);
    }
  };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setBlocks([]);
    setDialogOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditingId(u.id);
    setForm({
      name:       u.name,
      email:      u.email,
      roleId:     String(u.roleId),
      districtId: u.districtId ? String(u.districtId) : '',
      blockId:    u.blockId    ? String(u.blockId)    : '',
      azureAadId: '',
    });
    setFormError('');
    if (u.districtId) loadBlocks(String(u.districtId));
    setDialogOpen(true);
  };

  const setField = (field: keyof UserForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setSelect = (field: keyof UserForm) => (e: SelectChangeEvent) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
    if (field === 'districtId') {
      setForm((prev) => ({ ...prev, districtId: val, blockId: '' }));
      loadBlocks(val);
    }
  };

  const validate = (): boolean => {
    if (!form.name.trim())  { setFormError('Name is required');         return false; }
    if (!form.email.trim()) { setFormError('Email is required');        return false; }
    if (!form.roleId)       { setFormError('Role is required');         return false; }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setFormError('Enter a valid email address'); return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name:        form.name.trim(),
        email:       form.email.trim(),
        roleId:      Number(form.roleId),
        districtId:  form.districtId ? Number(form.districtId) : null,
        blockId:     form.blockId    ? Number(form.blockId)    : null,
        // Use email as AAD ID placeholder when not provided
        azureAadId:  form.azureAadId.trim() || form.email.trim(),
      };

      if (editingId !== null) {
        await apiClient.updateUser(editingId, payload);
      } else {
        await apiClient.createUser(payload);
      }

      setDialogOpen(false);
      loadUsers();
    } catch {
      setFormError('Failed to save user. Check that the email is not already registered.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: AppUser) => {
    setToggling(u.id);
    try {
      if (u.isActive) {
        await apiClient.deactivateUser(u.id);
      } else {
        await apiClient.activateUser(u.id);
      }
      loadUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const roleName = (roleId: number) => getRoleById(roleId)?.label ?? `Role ${roleId}`;
  const roleKey  = (roleId: number) => getRoleById(roleId)?.name  ?? '';

  const districtName = (id?: number) =>
    id ? (districts.find((d) => d.id === id)?.name ?? '—') : '—';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>User Management</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage system users and their role assignments
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} sx={{ borderRadius: 2 }}>
          Add User
        </Button>
      </Box>

      {/* ── Stats row ── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {ROLES.map((r) => {
          const count = users.filter((u) => u.roleId === r.id && u.isActive).length;
          return (
            <Paper key={r.id} sx={{ px: 2.5, py: 1.5, borderRadius: 2, minWidth: 130, textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{count}</Typography>
              <Typography variant="caption" color="text.secondary">{r.label}</Typography>
            </Paper>
          );
        })}
        <Paper sx={{ px: 2.5, py: 1.5, borderRadius: 2, minWidth: 130, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {users.filter((u) => !u.isActive).length}
          </Typography>
          <Typography variant="caption" color="text.secondary">Inactive</Typography>
        </Paper>
      </Box>

      {/* ── Table ── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>District</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow
                  key={u.id}
                  sx={{ opacity: u.isActive ? 1 : 0.55, '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>{u.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={roleName(u.roleId)}
                      size="small"
                      color={ROLE_COLORS[roleKey(u.roleId)] ?? 'default'}
                      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    {districtName(u.districtId)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={u.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={u.isActive ? 'success' : 'default'}
                      variant={u.isActive ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(u)} sx={{ mr: 0.5 }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={u.isActive ? 'Deactivate' : 'Activate'}>
                      <span>
                        <IconButton
                          size="small"
                          color={u.isActive ? 'error' : 'success'}
                          onClick={() => handleToggleActive(u)}
                          disabled={toggling === u.id}
                        >
                          {toggling === u.id
                            ? <CircularProgress size={16} />
                            : u.isActive
                              ? <DeactivateIcon fontSize="small" />
                              : <ActivateIcon fontSize="small" />
                          }
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No users found. Add the first user to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Add / Edit dialog ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {editingId !== null ? 'Edit User' : 'Add User'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {editingId !== null ? 'Update user details and role assignment' : 'Create a new system user and assign a role'}
          </Typography>
        </DialogTitle>
        <Divider />

        <DialogContent sx={{ pt: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            {/* Name */}
            <TextField
              label="Full Name"
              value={form.name}
              onChange={setField('name')}
              fullWidth
              required
              placeholder="e.g. Priya Sharma"
            />

            {/* Email */}
            <TextField
              label="Email Address"
              type="email"
              value={form.email}
              onChange={setField('email')}
              fullWidth
              required
              placeholder="e.g. priya.sharma@example.com"
            />

            {/* Role */}
            <FormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select value={form.roleId} label="Role" onChange={setSelect('roleId')}>
                {ROLES.map((r) => (
                  <MenuItem key={r.id} value={String(r.id)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Chip
                        label={r.label}
                        size="small"
                        color={ROLE_COLORS[r.name] ?? 'default'}
                        sx={{ fontWeight: 600, fontSize: '0.72rem', pointerEvents: 'none' }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider textAlign="left">
              <Typography variant="caption" color="text.secondary">
                Optional — restrict access by geography
              </Typography>
            </Divider>

            {/* District */}
            <FormControl fullWidth>
              <InputLabel>District (optional)</InputLabel>
              <Select value={form.districtId} label="District (optional)" onChange={setSelect('districtId')}>
                <MenuItem value=""><em>All Districts</em></MenuItem>
                {districts.map((d) => (
                  <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Block */}
            <FormControl fullWidth>
              <InputLabel>Block (optional)</InputLabel>
              <Select
                value={form.blockId}
                label="Block (optional)"
                onChange={setSelect('blockId')}
                disabled={!form.districtId}
              >
                <MenuItem value=""><em>All Blocks</em></MenuItem>
                {blocks.map((b) => (
                  <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* AAD ID — shown only when adding */}
            {editingId === null && (
              <>
                <Divider textAlign="left">
                  <Typography variant="caption" color="text.secondary">Azure AD (optional)</Typography>
                </Divider>
                <TextField
                  label="Azure AD Object ID"
                  value={form.azureAadId}
                  onChange={setField('azureAadId')}
                  fullWidth
                  placeholder="Leave blank to use email as identifier"
                  helperText="The user's object ID from Azure Active Directory. Used for SSO login."
                />
              </>
            )}
          </Box>
        </DialogContent>

        <Divider />
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}
            sx={{ minWidth: 100 }}
          >
            {saving ? 'Saving…' : editingId !== null ? 'Update' : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
