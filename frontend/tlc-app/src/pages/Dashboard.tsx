import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
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
import type { DashboardKpis, TLCAndMasterclass } from '../types';

type Accent = 'navy' | 'amber' | 'green' | 'red';

const ACCENTS: Record<Accent, { fg: string; bg: string }> = {
  navy:  { fg: '#1a3a6b', bg: '#e7eefb' },
  amber: { fg: '#b45309', bg: '#fef3c7' },
  green: { fg: '#15803d', bg: '#dcfce7' },
  red:   { fg: '#dc2626', bg: '#fee2e2' },
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const Dashboard: React.FC = () => {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [eventsPlannedThisMonth, setEventsPlannedThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [kpiRes, eventsRes] = await Promise.all([
          apiClient.getDashboardKpis(),
          apiClient.getTLCAndMasterclasses({ year: currentYear, status: 'Planned' }),
        ]);
        setKpis(kpiRes.data);

        const planned = (eventsRes.data as TLCAndMasterclass[]).filter((e) => {
          if (e.status !== 'Planned' || !e.dateConducted) return false;
          const d = new Date(e.dateConducted);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });
        setEventsPlannedThisMonth(planned.length);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentYear, currentMonth]);

  const KPICard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    accent: Accent;
  }> = ({ title, value, icon, accent }) => {
    const c = ACCENTS[accent];
    return (
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <Card sx={{ height: '100%', transition: 'box-shadow .2s, transform .2s',
                    '&:hover': { boxShadow: '0 8px 24px rgba(16,24,40,0.10)', transform: 'translateY(-2px)' } }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: 2.5, flexShrink: 0,
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       bgcolor: c.bg, color: c.fg }}>
              {icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.secondary',
                                textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.3 }}>
                {title}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '1.9rem', color: 'text.primary', lineHeight: 1.1, mt: 0.25 }}>
                {value}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Dashboard</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Programme overview at a glance — Teacher Leadership Circle
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
          <CircularProgress />
        </Box>
      ) : kpis ? (
        <Grid container spacing={2.5}>
          <KPICard title={`Events Planned · ${MONTH_NAMES[currentMonth]}`} value={eventsPlannedThisMonth} accent="amber" icon={<CalendarMonthIcon />} />
          <KPICard title="TLC Groups Formed"  value={kpis.tlcGroupsFormed}   accent="navy"  icon={<GroupsIcon />} />
          <KPICard title="Teacher Leaders"     value={kpis.teacherLeaders}    accent="navy"  icon={<SchoolIcon />} />
          <KPICard title="TLC Members"         value={kpis.tlcMembers}        accent="navy"  icon={<PeopleIcon />} />
          <KPICard title="TLC Meets Planned"   value={kpis.tlcMeetsPlanned}   accent="amber" icon={<EventNoteIcon />} />
          <KPICard title="TLC Meets Conducted" value={kpis.tlcMeetsConducted} accent="green" icon={<EventAvailableIcon />} />
          <KPICard title="TLCs Cancelled"      value={kpis.tlcsCancelled}     accent="red"   icon={<EventBusyIcon />} />
          <KPICard title="Masterclasses Held"  value={kpis.masterclassesHeld} accent="green" icon={<CoPresentIcon />} />
        </Grid>
      ) : (
        <Typography>No data available</Typography>
      )}
    </Box>
  );
};
