import React, { useEffect, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Stack,
} from '@mui/material';
import apiClient from '../services/apiClient';
import type { ExtendedDashboardKpis, AttendanceReportEntry, District, Block } from '../types';

export const Dashboard: React.FC = () => {
  const [kpis, setKpis] = useState<ExtendedDashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [districts, setDistricts] = useState<District[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [districtId, setDistrictId] = useState<number | undefined>(undefined);
  const [blockId, setBlockId] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  useEffect(() => {
    const loadMaster = async () => {
      try {
        const d = await apiClient.getDistricts();
        setDistricts(d.data || []);
      } catch (err) {
        console.error('Failed to load districts', err);
      }
    };
    loadMaster();
  }, []);

  useEffect(() => {
    const loadBlocks = async () => {
      try {
        if (districtId) {
          const b = await apiClient.getBlocks(districtId);
          setBlocks(b.data || []);
        } else {
          setBlocks([]);
        }
      } catch (err) {
        console.error('Failed to load blocks', err);
      }
    };
    loadBlocks();
  }, [districtId]);

  const loadKpis = async () => {
    setLoading(true);
    try {
      const s = startDate ? startDate.format('YYYY-MM-DD') : undefined;
      const e = endDate ? endDate.format('YYYY-MM-DD') : undefined;
      const resp = await apiClient.getDashboardKpis(districtId, blockId, s, e);
      setKpis(resp.data);
    } catch (err) {
      console.error('Error loading KPIs:', err);
      setKpis(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const KPICard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
    <Grid item xs={12} sm={6} md={4}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4">{value}</Typography>
        </CardContent>
      </Card>
    </Grid>
  );

  const AttendanceTable: React.FC<{ rows: AttendanceReportEntry[] }> = ({ rows }) => (
    <Paper sx={{ width: '100%', overflowX: 'auto', mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Teacher</TableCell>
            <TableCell>School</TableCell>
            <TableCell align="right">TLCs Attended</TableCell>
            <TableCell align="right">% of Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.teacherId}>
              <TableCell>{r.teacherName}</TableCell>
              <TableCell>{r.school}</TableCell>
              <TableCell align="right">{r.tlcsAttended}</TableCell>
              <TableCell align="right">{r.percentOfTotal.toFixed(1)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Main Dashboard
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={1}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(d) => setStartDate(d)}
                  slotProps={{
                    textField: { fullWidth: true, placeholder: 'dd/mm/yyyy' },
                    toolbar: { title: 'Start Date' as any },
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={1}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(d) => setEndDate(d)}
                  disableFuture
                  maxDate={dayjs()}
                  slotProps={{ textField: { fullWidth: true, placeholder: 'dd/mm/yyyy' }, toolbar: { title: 'End Date' as any } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField
                select
                label="District"
                fullWidth
                value={districtId ?? ''}
                onChange={(e) => setDistrictId(e.target.value ? Number(e.target.value) : undefined)}
              >
                <MenuItem value="">All</MenuItem>
                {districts.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField
                select
                label="Block"
                fullWidth
                value={blockId ?? ''}
                onChange={(e) => setBlockId(e.target.value ? Number(e.target.value) : undefined)}
                disabled={!districtId}
              >
                <MenuItem value="">All</MenuItem>
                {blocks.map((b) => (
                  <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Stack direction="column" spacing={1} alignItems="flex-start" sx={{ mt: 1 }}>
                <Button
                  variant="contained"
                  onClick={loadKpis}
                  disabled={loading}
                  size="small"
                  sx={{ minWidth: 140 }}
                >
                  Apply Filters
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setDistrictId(undefined);
                    setBlockId(undefined);
                    loadKpis();
                  }}
                  size="small"
                  sx={{ minWidth: 140 }}
                >
                  Clear
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : kpis ? (
        <>
          <Grid container spacing={2} sx={{ maxWidth: '1400px', mx: 'auto' }}>
            <KPICard title="TLC groups formed" value={kpis.tlcGroupsFormed} />
            <KPICard title="Teacher Leaders" value={kpis.teacherLeaders} />
            <KPICard title="Registered Teachers (TLC members)" value={kpis.tlcMembers} />
            <KPICard title="TIP teachers attended ≥1 TLC" value={kpis.tipTeachersAttendedAtLeastOne} />
            <KPICard title="Non-TIP teachers attended ≥1 TLC" value={kpis.nonTipTeachersAttendedAtLeastOne} />
            <KPICard title="TLC Meets Held" value={kpis.tlcMeetsHeld} />
            <KPICard title="TLCs cancelled" value={kpis.tlcsCancelled} />
            <KPICard title="% teachers attended ≥3" value={`${kpis.percentTeachersMin3.toFixed(1)}%`} />
            <KPICard title="masterclasses held" value={kpis.masterclassesHeld} />
            <KPICard title="Unique teachers attending ≥60% of TLCs" value={kpis.uniqueTeachers60PercentOrMore} />
            <KPICard title="Avg # teachers attending masterclasses" value={kpis.avgTeachersPerMasterclass.toFixed ? kpis.avgTeachersPerMasterclass.toFixed(1) : kpis.avgTeachersPerMasterclass} />
          </Grid>

          <Typography variant="h6" sx={{ mt: 3 }}>
            Attendance report for each TLC member
          </Typography>
          <AttendanceTable rows={kpis.attendanceReport || []} />
        </>
      ) : (
        <Typography>No data available</Typography>
      )}
    </Box>
  );
};
