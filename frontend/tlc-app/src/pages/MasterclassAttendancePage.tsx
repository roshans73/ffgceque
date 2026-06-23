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
import apiClient from '../services/apiClient';
import type { Teacher } from '../types';

interface AttendeeRow {
  teacherId: string;
  teacherName: string;
  school: string;
  gender: string;
  mobile: string;
  isNew: boolean;
}

const MasterclassAttendancePage: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [masterclassDate, setMasterclassDate] = useState('');
  const [location, setLocation] = useState('');
  const [topic, setTopic] = useState('');
  const [leadBy, setLeadBy] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.getTeachers().then((r) => setTeachers(r.data)).catch(console.error);
  }, []);

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
    if (!masterclassDate || !location || !topic || !leadBy || !startTime || !endTime || attendees.length === 0) {
      setError('Please fill all required fields and add at least one attendee');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await apiClient.recordMasterclassAttendance({
        masterclassDate,
        location,
        topic,
        leadBy: Number(leadBy),
        startTime,
        endTime,
        remarks,
        attendees: attendees.map((a) => ({
          teacherId: a.isNew ? undefined : (a.teacherId ? Number(a.teacherId) : undefined),
          teacherName: a.isNew ? a.teacherName : undefined,
          school: a.school,
          gender: a.gender,
          mobile: a.mobile,
          isTipTeacher: false,
        })),
      });
      setSuccess('Masterclass attendance recorded successfully');
      setAttendees([]);
    } catch {
      setError('Failed to record attendance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Masterclass Attendance Entry
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Masterclass Details</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField label="Date" type="date" value={masterclassDate} onChange={(e) => setMasterclassDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 200 }} />
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
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
            <TextField label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150 }} />
            <TextField label="End Time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150 }} />
          </Box>
          <TextField label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} fullWidth />
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
                  <Select size="small" value={a.isNew ? 'new' : 'existing'} onChange={(e: SelectChangeEvent) => updateAttendee(i, 'isNew', e.target.value === 'new')}>
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

      <Button variant="contained" size="large" onClick={handleSubmit} disabled={submitting} startIcon={submitting ? <CircularProgress size={16} /> : undefined}>
        {submitting ? 'Submitting...' : 'Submit Attendance'}
      </Button>
    </Box>
  );
};

export default MasterclassAttendancePage;
