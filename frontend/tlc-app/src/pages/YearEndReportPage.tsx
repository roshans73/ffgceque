import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import apiClient from '../services/apiClient';
import type { District } from '../types';

interface YearEndSummary {
  year: number;
  percentageTeachersAttending3OrMore: number;
  uniqueTeachersAttending60Percent: number;
  averageMasterclassAttendance: number;
  tipTeachersAttendance: number;
  nonTipTeachersAttendance: number;
}

const YearEndReportPage: React.FC = () => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [summary, setSummary] = useState<YearEndSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  useEffect(() => {
    apiClient.getDistricts().then((r) => setDistricts(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    loadSummary();
  }, [selectedDistrict, selectedYear]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const r = await apiClient.getYearEndSummary(
        selectedDistrict ? Number(selectedDistrict) : undefined,
        undefined,
        Number(selectedYear)
      );
      setSummary(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Card>
        <CardContent>
          <Typography color="textSecondary" variant="body2" gutterBottom>{label}</Typography>
          <Typography variant="h5">{value}</Typography>
        </CardContent>
      </Card>
    </Grid>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Year-End Summary Report
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Year</InputLabel>
          <Select value={selectedYear} label="Year" onChange={(e: SelectChangeEvent) => setSelectedYear(e.target.value)}>
            {years.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>District</InputLabel>
          <Select value={selectedDistrict} label="District" onChange={(e: SelectChangeEvent) => setSelectedDistrict(e.target.value)}>
            <MenuItem value="">All Districts</MenuItem>
            {districts.map((d) => (
              <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : summary ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Year: {summary.year}</Typography>
          <Grid container spacing={2}>
            <MetricCard label="% Teachers Attending 3+ TLCs" value={`${summary.percentageTeachersAttending3OrMore.toFixed(1)}%`} />
            <MetricCard label="Teachers Attending 60%+ TLCs" value={summary.uniqueTeachersAttending60Percent} />
            <MetricCard label="Avg Masterclass Attendance" value={summary.averageMasterclassAttendance.toFixed(1)} />
            <MetricCard label="TIP Teachers Attending" value={summary.tipTeachersAttendance} />
            <MetricCard label="Non-TIP Teachers Attending" value={summary.nonTipTeachersAttendance} />
          </Grid>
        </Paper>
      ) : (
        <Typography color="textSecondary">No data available for the selected period</Typography>
      )}
    </Box>
  );
};

export default YearEndReportPage;
