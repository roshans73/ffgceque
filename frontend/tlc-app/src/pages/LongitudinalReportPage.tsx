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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import apiClient from '../services/apiClient';
import type { District } from '../types';

interface YearlyMetric {
  year: number;
  tlcGroupsFormed: number;
  meetsPlanned: number;
  meetsConducted: number;
  masterclassesHeld: number;
  membersCount: number;
}

interface LongitudinalData {
  yearlyMetrics: YearlyMetric[];
  averageTLCsPerGroupPerYear: number;
}

const LongitudinalReportPage: React.FC = () => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [data, setData] = useState<LongitudinalData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient.getDistricts().then((r) => setDistricts(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedDistrict]);

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await apiClient.getLongitudinalAnalysis(
        selectedDistrict ? Number(selectedDistrict) : undefined
      );
      setData(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Longitudinal Analysis
      </Typography>

      <FormControl sx={{ minWidth: 200, mb: 3 }}>
        <InputLabel>District</InputLabel>
        <Select value={selectedDistrict} label="District" onChange={(e: SelectChangeEvent) => setSelectedDistrict(e.target.value)}>
          <MenuItem value="">All Districts</MenuItem>
          {districts.map((d) => (
            <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : data && data.yearlyMetrics.length > 0 ? (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Year-over-Year Trends</Typography>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.yearlyMetrics} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="meetsConducted" stroke="#1976d2" name="TLCs Conducted" />
                <Line type="monotone" dataKey="masterclassesHeld" stroke="#dc004e" name="Masterclasses" />
                <Line type="monotone" dataKey="tlcGroupsFormed" stroke="#388e3c" name="TLC Groups" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Avg TLCs per Group/Year: {data.averageTLCsPerGroupPerYear.toFixed(1)}
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Year</TableCell>
                    <TableCell align="right">TLC Groups</TableCell>
                    <TableCell align="right">Meets Planned</TableCell>
                    <TableCell align="right">Meets Conducted</TableCell>
                    <TableCell align="right">Masterclasses</TableCell>
                    <TableCell align="right">Members</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.yearlyMetrics.map((m) => (
                    <TableRow key={m.year}>
                      <TableCell>{m.year}</TableCell>
                      <TableCell align="right">{m.tlcGroupsFormed}</TableCell>
                      <TableCell align="right">{m.meetsPlanned}</TableCell>
                      <TableCell align="right">{m.meetsConducted}</TableCell>
                      <TableCell align="right">{m.masterclassesHeld}</TableCell>
                      <TableCell align="right">{m.membersCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      ) : (
        <Typography color="textSecondary">No longitudinal data available</Typography>
      )}
    </Box>
  );
};

export default LongitudinalReportPage;
