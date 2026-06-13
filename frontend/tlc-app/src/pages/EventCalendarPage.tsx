import React, { useEffect, useState, useCallback } from 'react';
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
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Add as AddIcon,
  ArrowBackIos as PrevIcon,
  ArrowForwardIos as NextIcon,
  CalendarMonth as CalendarIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import apiClient from '../services/apiClient';
import { getDistricts, getBlocks, getTLCGroups, getTeachers } from '../services/offlineApi';
import type { District, Block, TLCGroup, Teacher } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TLCEvent {
  id: number;
  code: string;
  type: string;
  status: string;
  dateConducted: string | null;
  locationConducted: string;
  startTime: string | null;
  endTime: string | null;
  ledBy: number | null;
  topic: string;
  totalAttendance: number;
  remarks: string;
  tlcGroupId: number | null;
  districtId: number | null;
  blockId: number | null;
}

interface EventFormState {
  type: string;
  districtId: string;
  blockId: string;
  tlcGroupId: string;
  status: string;
  locationConducted: string;
  startTime: string;
  endTime: string;
  ledBy: string;
  topic: string;
  remarks: string;
}

const EMPTY_FORM: EventFormState = {
  type: 'TLC',
  districtId: '',
  blockId: '',
  tlcGroupId: '',
  status: 'Planned',
  locationConducted: '',
  startTime: '',
  endTime: '',
  ledBy: '',
  topic: '',
  remarks: '',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'error'> = {
  Planned: 'primary',
  Conducted: 'success',
  Cancelled: 'error',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ─── Component ────────────────────────────────────────────────────────────────

const EventCalendarPage: React.FC = () => {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [events, setEvents]       = useState<TLCEvent[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [selectedDate, setSelectedDate]   = useState<string>('');
  const [viewEvent, setViewEvent]         = useState<TLCEvent | null>(null);
  const [form, setForm]                   = useState<EventFormState>(EMPTY_FORM);
  const [submitting, setSubmitting]       = useState(false);
  const [submitError, setSubmitError]     = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Master data
  const [districts, setDistricts] = useState<District[]>([]);
  const [blocks, setBlocks]       = useState<Block[]>([]);
  const [groups, setGroups]       = useState<TLCGroup[]>([]);
  const [teachers, setTeachers]   = useState<Teacher[]>([]);

  // ── Load master data ──────────────────────────────────────────────────────
  useEffect(() => {
    getDistricts().then(setDistricts).catch(console.error);
    getTeachers().then(setTeachers).catch(console.error);
    getTLCGroups().then(setGroups).catch(console.error);
  }, []);

  // ── Load events for current month ─────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.getTLCAndMasterclasses({ year: viewYear });
      const all: TLCEvent[] = res.data;
      // Filter to current month client-side (year filter already applied)
      setEvents(
        all.filter((e) => {
          if (!e.dateConducted) return false;
          const d = parseLocalDate(e.dateConducted);
          return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
        }),
      );
    } catch {
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [viewYear, viewMonth]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Calendar grid computation ──────────────────────────────────────────────
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete the last row
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDate: Record<string, TLCEvent[]> = {};
  events.forEach((e) => {
    if (e.dateConducted) {
      const key = e.dateConducted.split('T')[0];
      if (!eventsByDate[key]) eventsByDate[key] = [];
      eventsByDate[key].push(e);
    }
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  // ── Open dialog to create ─────────────────────────────────────────────────
  const openCreate = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setViewEvent(null);
    setForm({ ...EMPTY_FORM });
    setSubmitError('');
    setSubmitSuccess('');
    setDialogOpen(true);
  };

  // ── Open dialog to view event ─────────────────────────────────────────────
  const openView = (e: TLCEvent, ev: React.MouseEvent) => {
    ev.stopPropagation();
    setViewEvent(e);
    setSelectedDate(e.dateConducted?.split('T')[0] ?? '');
    setDialogOpen(true);
  };

  // ── Form field handlers ───────────────────────────────────────────────────
  const handleSelect = (field: keyof EventFormState) =>
    async (e: SelectChangeEvent) => {
      const val = e.target.value;
      setForm((prev) => ({ ...prev, [field]: val }));

      if (field === 'districtId') {
        setForm((prev) => ({ ...prev, districtId: val, blockId: '', tlcGroupId: '' }));
        if (val) {
          const data = await getBlocks(Number(val));
          setBlocks(data);
        } else {
          setBlocks([]);
        }
      }
    };

  const handleText = (field: keyof EventFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.topic.trim()) { setSubmitError('Topic is required.'); return; }
    if (form.type === 'TLC' && !form.tlcGroupId) { setSubmitError('TLC Group is required for TLC events.'); return; }

    setSubmitting(true);
    setSubmitError('');
    try {
      await apiClient.createTLCAndMasterclass({
        type: form.type,
        tlcGroupId:        form.tlcGroupId  ? Number(form.tlcGroupId)  : null,
        districtId:        form.districtId  ? Number(form.districtId)  : null,
        blockId:           form.blockId     ? Number(form.blockId)     : null,
        status:            form.status,
        dateConducted:     selectedDate ? `${selectedDate}T00:00:00` : null,
        locationConducted: form.locationConducted,
        startTime:         form.startTime || null,
        endTime:           form.endTime   || null,
        ledBy:             form.ledBy     ? Number(form.ledBy)     : null,
        topic:             form.topic,
        remarks:           form.remarks,
      });
      setSubmitSuccess('Event saved successfully!');
      fetchEvents();
      setTimeout(() => setDialogOpen(false), 1200);
    } catch {
      setSubmitError('Failed to save event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const todayKey = toDateKey(today);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
        <CalendarIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Event Calendar</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Calendar card */}
      <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden' }}>

        {/* Month navigation */}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 3, py: 2,
            bgcolor: 'primary.main', color: 'white',
          }}
        >
          <IconButton onClick={prevMonth} size="small" sx={{ color: 'white' }}>
            <PrevIcon fontSize="small" />
          </IconButton>

          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {MONTHS[viewMonth]} {viewYear}
          </Typography>

          <IconButton onClick={nextMonth} size="small" sx={{ color: 'white' }}>
            <NextIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Day headers */}
        <Grid container columns={7} sx={{ bgcolor: '#f0f4ff' }}>
          {DAYS.map((d) => (
            <Grid key={d} size={1}>
              <Box sx={{ py: 1, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }} color="text.secondary">
                  {d}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider />

        {/* Calendar grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container columns={7} sx={{ minHeight: 480 }}>
            {cells.map((day, idx) => {
              if (!day) {
                return (
                  <Grid key={`empty-${idx}`} size={1}>
                    <Box
                      sx={{
                        minHeight: 100,
                        bgcolor: '#fafafa',
                        borderRight: '1px solid #eee',
                        borderBottom: '1px solid #eee',
                      }}
                    />
                  </Grid>
                );
              }

              const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsByDate[dateKey] ?? [];
              const isToday   = dateKey === todayKey;

              return (
                <Grid key={day} size={1}>
                  <Box
                    onClick={() => openCreate(day)}
                    sx={{
                      minHeight: 100,
                      p: 0.75,
                      borderRight: '1px solid #eee',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.15s',
                      '&:hover': { bgcolor: '#f0f7ff' },
                      '&:hover .add-hint': { opacity: 1 },
                    }}
                  >
                    {/* Day number */}
                    <Box
                      sx={{
                        width: 28, height: 28,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%',
                        bgcolor: isToday ? 'primary.main' : 'transparent',
                        color:   isToday ? 'white' : 'text.primary',
                        fontWeight: isToday ? 700 : 400,
                        fontSize: '0.85rem',
                        mb: 0.5,
                      }}
                    >
                      {day}
                    </Box>

                    {/* Add hint icon */}
                    <Tooltip title="Add event">
                      <AddIcon
                        className="add-hint"
                        sx={{
                          position: 'absolute', top: 4, right: 4,
                          fontSize: '1rem', color: 'primary.light',
                          opacity: 0, transition: 'opacity 0.15s',
                        }}
                      />
                    </Tooltip>

                    {/* Events */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <Tooltip key={ev.id} title={`${ev.code} — ${ev.topic}`}>
                          <Chip
                            label={ev.topic.length > 14 ? ev.topic.slice(0, 12) + '…' : ev.topic}
                            size="small"
                            color={STATUS_COLORS[ev.status] ?? 'default'}
                            onClick={(e) => openView(ev, e)}
                            sx={{ fontSize: '0.68rem', height: 20, cursor: 'pointer' }}
                          />
                        </Tooltip>
                      ))}
                      {dayEvents.length > 3 && (
                        <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                          +{dayEvents.length - 3} more
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label={status} size="small" color={color} sx={{ height: 20, fontSize: '0.7rem' }} />
          </Box>
        ))}
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
          Click any date to add an event
        </Typography>
      </Box>

      {/* ── Create / View Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box>
            {viewEvent
              ? <Typography sx={{ fontWeight: 700 }} variant="h6">{viewEvent.code}</Typography>
              : <Typography sx={{ fontWeight: 700 }} variant="h6">New Event — {selectedDate}</Typography>
            }
          </Box>
          <IconButton size="small" onClick={() => setDialogOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 2 }}>
          {/* View mode */}
          {viewEvent ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Row label="Type"     value={viewEvent.type} />
              <Row label="Status"   value={<Chip label={viewEvent.status} size="small" color={STATUS_COLORS[viewEvent.status] ?? 'default'} />} />
              <Row label="Date"     value={viewEvent.dateConducted?.split('T')[0] ?? '—'} />
              <Row label="Topic"    value={viewEvent.topic || '—'} />
              <Row label="Location" value={viewEvent.locationConducted || '—'} />
              {viewEvent.startTime && <Row label="Time" value={`${viewEvent.startTime} – ${viewEvent.endTime ?? ''}`} />}
              <Row label="Attendance" value={String(viewEvent.totalAttendance)} />
              {viewEvent.remarks && <Row label="Remarks" value={viewEvent.remarks} />}
            </Box>
          ) : (
            /* Create mode */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {submitError   && <Alert severity="error"   onClose={() => setSubmitError('')}>{submitError}</Alert>}
              {submitSuccess && <Alert severity="success">{submitSuccess}</Alert>}

              {/* Type */}
              <FormControl fullWidth size="small">
                <InputLabel>Event Type *</InputLabel>
                <Select value={form.type} label="Event Type *" onChange={handleSelect('type')}>
                  <MenuItem value="TLC">TLC</MenuItem>
                  <MenuItem value="Masterclass">Masterclass</MenuItem>
                </Select>
              </FormControl>

              {/* District */}
              <FormControl fullWidth size="small">
                <InputLabel>District</InputLabel>
                <Select value={form.districtId} label="District" onChange={handleSelect('districtId')}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {districts.map((d) => (
                    <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Block */}
              {form.districtId && (
                <FormControl fullWidth size="small">
                  <InputLabel>Block</InputLabel>
                  <Select value={form.blockId} label="Block"
                    onChange={(e) => setForm((p) => ({ ...p, blockId: e.target.value, tlcGroupId: '' }))}>
                    <MenuItem value=""><em>None</em></MenuItem>
                    {blocks.map((b) => (
                      <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* TLC Group (required for TLC type) */}
              {form.type === 'TLC' && (
                <FormControl fullWidth size="small">
                  <InputLabel>TLC Group *</InputLabel>
                  <Select value={form.tlcGroupId} label="TLC Group *"
                    onChange={(e) => setForm((p) => ({ ...p, tlcGroupId: e.target.value }))}>
                    <MenuItem value=""><em>Select group</em></MenuItem>
                    {groups
                      .filter((g) => !form.blockId || String(g.blockId) === form.blockId)
                      .map((g) => (
                        <MenuItem key={g.id} value={String(g.id)}>{g.tlcGroupCode}</MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}

              {/* Status */}
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={form.status} label="Status" onChange={handleSelect('status')}>
                  <MenuItem value="Planned">Planned</MenuItem>
                  <MenuItem value="Conducted">Conducted</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>

              {/* Topic */}
              <TextField
                label="Topic *"
                size="small"
                fullWidth
                value={form.topic}
                onChange={handleText('topic')}
              />

              {/* Location */}
              <TextField
                label="Location"
                size="small"
                fullWidth
                value={form.locationConducted}
                onChange={handleText('locationConducted')}
              />

              {/* Time row */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Start Time"
                  type="time"
                  size="small"
                  fullWidth
                  value={form.startTime}
                  onChange={handleText('startTime')}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="End Time"
                  type="time"
                  size="small"
                  fullWidth
                  value={form.endTime}
                  onChange={handleText('endTime')}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>

              {/* Led By */}
              <FormControl fullWidth size="small">
                <InputLabel>Led By</InputLabel>
                <Select value={form.ledBy} label="Led By"
                  onChange={(e) => setForm((p) => ({ ...p, ledBy: e.target.value }))}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {teachers.map((t) => (
                    <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Remarks */}
              <TextField
                label="Remarks"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={form.remarks}
                onChange={handleText('remarks')}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" size="small">
            {viewEvent ? 'Close' : 'Cancel'}
          </Button>
          {!viewEvent && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              size="small"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              {submitting ? 'Saving…' : 'Save Event'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ─── Small helper to render label/value rows in view mode ────────────────────
const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90, fontWeight: 500 }}>
      {label}
    </Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

export default EventCalendarPage;
