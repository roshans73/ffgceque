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
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import apiClient from '../services/apiClient';
import type { District, TeacherLeaderFormation } from '../types';

const TeacherLeaderFormationReportPage: React.FC = () => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [data, setData] = useState<TeacherLeaderFormation[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    apiClient.getDistricts().then((r) => setDistricts(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedDistrict]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getTeacherLeaderFormationReport(
        selectedDistrict ? Number(selectedDistrict) : undefined
      );
      setData(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const response = await apiClient.downloadTeacherLeaderFormationReport(
        selectedDistrict ? Number(selectedDistrict) : undefined
      );

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'teacher-leader-formation.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Teacher Leader Formation Report
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel>District</InputLabel>
          <Select
            value={selectedDistrict}
            label="District"
            onChange={(e: SelectChangeEvent) => setSelectedDistrict(e.target.value)}
          >
            <MenuItem value="">All Districts</MenuItem>
            {districts.map((district) => (
              <MenuItem key={district.id} value={String(district.id)}>
                {district.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          color="primary"
          onClick={downloadCsv}
          disabled={downloading}
        >
          {downloading ? 'Downloading...' : 'Download CSV'}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle2">Rows</Typography>
              <Typography variant="h5">{data.length}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle2">District</Typography>
              <Typography variant="h5">
                {selectedDistrict
                  ? districts.find((d) => String(d.id) === selectedDistrict)?.name ?? 'Selected'
                  : 'All Districts'}
              </Typography>
            </Grid>
          </Grid>

          {data.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Teacher Leader</TableCell>
                    <TableCell>Date Formed</TableCell>
                    <TableCell>TLC Group</TableCell>
                    <TableCell>District</TableCell>
                    <TableCell>Block</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.slice(0, 20).map((row) => (
                    <TableRow key={row.teacherLeaderId}>
                      <TableCell>{row.teacherName}</TableCell>
                      <TableCell>{row.dateFormed}</TableCell>
                      <TableCell>{row.tlcGroupCode}</TableCell>
                      <TableCell>{row.district}</TableCell>
                      <TableCell>{row.block}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="textSecondary">No teacher leader formation data found.</Typography>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default TeacherLeaderFormationReportPage;
