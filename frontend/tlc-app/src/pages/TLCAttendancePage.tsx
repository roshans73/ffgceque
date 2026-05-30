import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  Alert,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { db } from '../db/localDb';
import type { PendingAttendance } from '../db/localDb';
import { useSync } from '../context/SyncContext';
import { getDistricts, getTeachers, getBlocks, getTLCGroups } from '../services/offlineApi';
import type { TLCGroup, Teacher, District, Block } from '../types';

interface AttendeeRow {
  teacherId: string;
  teacherName: string;
  school: string;
  gender: string;
  mobile: string;
  isNew: boolean;
}

const TLCAttendancePage: React.FC = () => {
  const { sync } = useSync();

  const [districts, setDistricts] = useState<District[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [groups, setGroups] = useState<TLCGroup[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [tlcDate, setTlcDate] = useState('');
  const [location, setLocation] = useState('');
  const [leadBy, setLeadBy] = useState('');
  const [topic, setTopic] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getDistricts().then(setDistricts).catch(console.error);
    getTeachers().then(setTeachers).catch(console.error);
  }, []);

  const handleDistrictChange = async (e: SelectChangeEvent) => {
    setSelectedDistrict(e.target.value);
    setSelectedBlock('');
    setSelectedGroup('');
    if (e.target.value) {
      const data = await getBlocks(Number(e.target.value));
      setBlocks(data);
    } else {
      setBlocks([]);
      setGroups([]);
    }
  };

  const handleBlockChange = async (e: SelectChangeEvent) => {
    setSelectedBlock(e.target.value);
    setSelectedGroup('');
    if (e.target.value) {
      const data = await getTLCGroups();
      setGroups(data.filter((g: TLCGroup) => g.blockId === Number(e.target.value)));
    } else {
      setGroups([]);
    }
  };

  const addAttendee = () => {
    setAttendees([...attendees, { teacherId: '', teacherName: '', school: '', gender: '', mobile: '', isNew: false }]);
  };

  const removeAttendee = (i: number) => {
    setAttendees(attendees.filter((_, idx) => idx !== i));
  };

  const updateAttendee = (i: number, field: keyof AttendeeRow, value: string | boolean) => {
    const updated = [...attendees];
    updated[i] = { ...updated[i], [field]: value };
    setAttendees(updated);
  };

  const handleSubmit = async () => {
    if (!selectedGroup || !tlcDate || !location || !leadBy || !topic || attendees.length === 0) {
      setError('Please fill all required fields and add at least one attendee');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        tlcGroupId: Number(selectedGroup),
        tlcDate,
        location,
        leadBy: Number(leadBy),
        topic,
        remarks,
        attendees: attendees.map((a) => ({
          teacherId: a.isNew ? undefined : (a.teacherId ? Number(a.teacherId) : undefined),
          teacherName: a.isNew ? a.teacherName : undefined,
          school: a.school,
          gender: a.gender,
          mobile: a.mobile,
          isTipTeacher: false,
        })),
      };

      const record: PendingAttendance = {
        id: crypto.randomUUID(),
        type: 'tlc',
        payload,
        createdAt: Date.now(),
        syncStatus: 'pending',
        attempts: 0,
      };

      await db.pendingAttendance.add(record);
      await sync();

      const updated = await db.pendingAttendance.get(record.id);
      if (updated?.syncStatus === 'synced') {
        setSuccess('TLC attendance recorded and synced successfully.');
      } else {
        setSuccess('Saved locally — will sync automatically when online.');
      }
      setAttendees([]);
    } catch {
      setError('Failed to save attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        TLC Attendance Entry
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>TLC Details</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>District</InputLabel>
              <Select value={selectedDistrict} label="District" onChange={handleDistrictChange}>
                {districts.map((d) => (
                  <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Block</InputLabel>
              <Select value={selectedBlock} label="Block" onChange={handleBlockChange} disabled={!selectedDistrict}>
                {blocks.map((b) => (
                  <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 220 }}>
              <InputLabel>TLC Group</InputLabel>
              <Select value={selectedGroup} label="TLC Group" onChange={(e: SelectChangeEvent) => setSelectedGroup(e.target.value)} disabled={!selectedBlock}>
                {groups.map((g) => (
                  <MenuItem key={g.id} value={String(g.id)}>{g.tlcGroupCode}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField label="Date" type="date" value={tlcDate} onChange={(e) => setTlcDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 200 }} />
            <TextField label="Location" value={location} onChange={(e) => setLocation(e.target.value)} sx={{ width: 250 }} />
            <FormControl sx={{ minWidth: 220 }}>
              <InputLabel>Led By</InputLabel>
              <Select value={leadBy} label="Led By" onChange={(e: SelectChangeEvent) => setLeadBy(e.target.value)}>
                {teachers.map((t) => (
                  <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} sx={{ flex: 1 }} />
            <TextField label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} sx={{ flex: 1 }} />
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Attendees ({attendees.length})</Typography>
          <Button startIcon={<AddIcon />} onClick={addAttendee}>Add Attendee</Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Teacher</TableCell>
              <TableCell>School</TableCell>
              <TableCell>Gender</TableCell>
              <TableCell>Mobile</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attendees.map((a, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Select
                    size="small"
                    value={a.isNew ? 'new' : 'existing'}
                    onChange={(e: SelectChangeEvent) => updateAttendee(i, 'isNew', e.target.value === 'new')}
                  >
                    <MenuItem value="existing">Existing</MenuItem>
                    <MenuItem value="new">New</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  {a.isNew ? (
                    <TextField size="small" placeholder="Name" value={a.teacherName} onChange={(e) => updateAttendee(i, 'teacherName', e.target.value)} />
                  ) : (
                    <Select size="small" value={a.teacherId} onChange={(e: SelectChangeEvent) => updateAttendee(i, 'teacherId', e.target.value)} sx={{ minWidth: 150 }}>
                      {teachers.map((t) => (
                        <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
                      ))}
                    </Select>
                  )}
                </TableCell>
                <TableCell><TextField size="small" placeholder="School" value={a.school} onChange={(e) => updateAttendee(i, 'school', e.target.value)} /></TableCell>
                <TableCell>
                  <Select size="small" value={a.gender} onChange={(e: SelectChangeEvent) => updateAttendee(i, 'gender', e.target.value)} sx={{ minWidth: 80 }}>
                    <MenuItem value="M">M</MenuItem>
                    <MenuItem value="F">F</MenuItem>
                  </Select>
                </TableCell>
                <TableCell><TextField size="small" placeholder="Mobile" value={a.mobile} onChange={(e) => updateAttendee(i, 'mobile', e.target.value)} /></TableCell>
                <TableCell><IconButton size="small" onClick={() => removeAttendee(i)}><DeleteIcon /></IconButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Button
        variant="contained"
        size="large"
        onClick={handleSubmit}
        disabled={submitting}
        startIcon={submitting ? <CircularProgress size={16} /> : undefined}
      >
        {submitting ? 'Saving...' : 'Submit Attendance'}
      </Button>
    </Box>
  );
};

export default TLCAttendancePage;
