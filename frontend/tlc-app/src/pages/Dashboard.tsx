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
import {
  Groups as GroupsIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  EventAvailable as EventAvailableIcon,
  EventNote as EventNoteIcon,
  EventBusy as EventBusyIcon,
  CoPresent as CoPresentIcon,
  CalendarMonth as CalendarMonthIcon,
} from '@mui/icons-material';
import apiClient from '../services/apiClient';
import type { DashboardKpis } from '../types';

export const Dashboard: React.FC = () => {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await apiClient.getDashboardKpis();
        setKpis(response.data);
      } catch (error) {
        console.error('Error loading KPIs:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const KPICard: React.FC<{ title: string; value: number }> = ({ title, value }) => (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
          <CircularProgress />
        </Box>
      ) : kpis ? (
        <Grid container spacing={2}>
          <KPICard title="TLC Groups Formed"   value={kpis.tlcGroupsFormed}    />
          <KPICard title="Teacher Leaders"      value={kpis.teacherLeaders}     />
          <KPICard title="TLC Members"          value={kpis.tlcMembers}         />
          <KPICard title="TLC Meets Planned"    value={kpis.tlcMeetsPlanned}    />
          <KPICard title="TLC Meets Conducted"  value={kpis.tlcMeetsConducted}  />
          <KPICard title="TLCs Cancelled"       value={kpis.tlcsCancelled}      />
          <KPICard title="Masterclasses Held"   value={kpis.masterclassesHeld}  />
        </Grid>
      ) : (
        <Typography>No data available</Typography>
      )}
    </Box>
  );
};
