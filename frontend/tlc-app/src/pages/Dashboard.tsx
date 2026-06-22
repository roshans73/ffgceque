import React, { useEffect, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Stack,
} from "@mui/material";
import {
  Groups as GroupsIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  EventAvailable as EventAvailableIcon,
  EventNote as EventNoteIcon,
  EventBusy as EventBusyIcon,
  CoPresent as CoPresentIcon,
  CalendarMonth as CalendarMonthIcon,
} from "@mui/icons-material";
import apiClient from "../services/apiClient";
import type {
  TLCAndMasterclass,
  ExtendedDashboardKpis,
  AttendanceReportEntry,
  District,
  Block,
} from "../types";

type Accent = "navy" | "amber" | "green" | "red";

type DashboardFilters = {
  districtId?: number;
  blockId?: number;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
};

const ACCENTS: Record<Accent, { fg: string; bg: string }> = {
  navy: { fg: "#1a3a6b", bg: "#e7eefb" },
  amber: { fg: "#b45309", bg: "#fef3c7" },
  green: { fg: "#15803d", bg: "#dcfce7" },
  red: { fg: "#dc2626", bg: "#fee2e2" },
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const Dashboard: React.FC = () => {
  const [kpis, setKpis] = useState<ExtendedDashboardKpis | null>(null); //ExtendedDashboardKpis(Avantika)/DashboardKpis(Gaurangi)
  const [eventsPlannedThisMonth, setEventsPlannedThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [districts, setDistricts] = useState<District[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [districtId, setDistrictId] = useState<number | undefined>(undefined);
  const [blockId, setBlockId] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const eventsPlannedLabel =
    startDate || endDate ? "Selected Range" : MONTH_NAMES[currentMonth];

  const renderDistrictValue = (selected: unknown) => {
    if (selected === "" || selected == null) return "All";
    return districts.find((d) => d.id === Number(selected))?.name ?? "All";
  };

  const renderBlockValue = (selected: unknown) => {
    if (selected === "" || selected == null) return "All";
    return blocks.find((b) => b.id === Number(selected))?.name ?? "All";
  };

  const isEventInSelectedWindow = (
    event: TLCAndMasterclass,
    filters: DashboardFilters,
  ) => {
    if (event.status !== "Planned" || !event.dateConducted) return false;

    const eventDate = dayjs(event.dateConducted);

    if (filters.startDate || filters.endDate) {
      const startsAfterRangeStart =
        !filters.startDate ||
        eventDate.isSame(filters.startDate, "day") ||
        eventDate.isAfter(filters.startDate, "day");
      const endsBeforeRangeEnd =
        !filters.endDate ||
        eventDate.isSame(filters.endDate, "day") ||
        eventDate.isBefore(filters.endDate, "day");

      return startsAfterRangeStart && endsBeforeRangeEnd;
    }

    return eventDate.year() === currentYear && eventDate.month() === currentMonth;
  };

  const fetchDashboardData = async (filters: DashboardFilters) => {
    setLoading(true);
    try {
      const s = filters.startDate
        ? filters.startDate.format("YYYY-MM-DD")
        : undefined;
      const e = filters.endDate
        ? filters.endDate.format("YYYY-MM-DD")
        : undefined;

      const [kpiRes, eventsRes] = await Promise.all([
        apiClient.getDashboardKpis(filters.districtId, filters.blockId, s, e),
        apiClient.getTLCAndMasterclasses({
          status: "Planned",
          districtId: filters.districtId,
          blockId: filters.blockId,
        }),
      ]);

      setKpis(kpiRes.data);
      setEventsPlannedThisMonth(
        (eventsRes.data as TLCAndMasterclass[]).filter((event) =>
          isEventInSelectedWindow(event, filters),
        ).length,
      );
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setKpis(null);
      setEventsPlannedThisMonth(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadMaster = async () => {
      try {
        const d = await apiClient.getDistricts();
        setDistricts(d.data || []);
      } catch (err) {
        console.error("Failed to load districts", err);
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
        console.error("Failed to load blocks", err);
      }
    };
    loadBlocks();
  }, [districtId]);

  const loadKpis = async () => {
    await fetchDashboardData({ districtId, blockId, startDate, endDate });
  };

  useEffect(() => {
    loadKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const KPICard: React.FC<{
    title: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
    accent?: Accent;
  }> = ({ title, value, icon, accent = "navy" }) => {
    const c = ACCENTS[accent];
    return (
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <Card
          sx={{
            height: "100%",
            transition: "box-shadow .2s, transform .2s",
            "&:hover": {
              boxShadow: "0 8px 24px rgba(16,24,40,0.10)",
              transform: "translateY(-2px)",
            },
          }}
        >
          <CardContent
            sx={{ display: "flex", alignItems: "center", gap: 2, py: 2.5 }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2.5,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: c.bg,
                color: c.fg,
              }}
            >
              {icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  lineHeight: 1.3,
                }}
              >
                {title}
              </Typography>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: "1.9rem",
                  color: "text.primary",
                  lineHeight: 1.1,
                  mt: 0.25,
                }}
              >
                {value}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const AttendanceTable: React.FC<{ rows: AttendanceReportEntry[] }> = ({
    rows,
  }) => (
    <Paper sx={{ width: "100%", overflowX: "auto", mt: 2 }}>
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
              <TableCell align="right">
                {(r.percentOfTotal ?? 0).toFixed(1)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Programme overview at a glance — Teacher Leadership Circle
        </Typography>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(d) => setStartDate(d)}
                  format="DD/MM/YYYY"
                  slotProps={{
                    textField: { fullWidth: true },
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(d) => setEndDate(d)}
                  format="DD/MM/YYYY"
                  disableFuture
                  maxDate={dayjs()}
                  slotProps={{
                    textField: { fullWidth: true },
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="dashboard-district-label" shrink>
                  District
                </InputLabel>
                <Select
                  labelId="dashboard-district-label"
                  label="District"
                  value={districtId?.toString() ?? ""}
                  displayEmpty
                  renderValue={renderDistrictValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDistrictId(
                      value ? Number(value) : undefined,
                    );
                    setBlockId(undefined);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  {districts.map((d) => (
                    <MenuItem key={d.id} value={d.id.toString()}>
                      {d.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth disabled={!districtId}>
                <InputLabel id="dashboard-block-label" shrink>
                  Block
                </InputLabel>
                <Select
                  labelId="dashboard-block-label"
                  label="Block"
                  value={blockId?.toString() ?? ""}
                  displayEmpty
                  renderValue={renderBlockValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    setBlockId(
                      value ? Number(value) : undefined,
                    );
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  {blocks.map((b) => (
                    <MenuItem key={b.id} value={b.id.toString()}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Stack
                direction={{ xs: "column", sm: "row", md: "column" }}
                spacing={1}
                sx={{
                  height: "100%",
                  justifyContent: "center",
                  alignItems: { xs: "stretch", sm: "flex-start", md: "stretch" },
                }}
              >
                <Button
                  variant="contained"
                  onClick={loadKpis}
                  disabled={loading}
                  size="small"
                  sx={{ minWidth: 140, width: { xs: "100%", sm: "auto", md: "100%" } }}
                >
                  Apply Filters
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const clearedFilters: DashboardFilters = {
                      districtId: undefined,
                      blockId: undefined,
                      startDate: null,
                      endDate: null,
                    };

                    setStartDate(null);
                    setEndDate(null);
                    setDistrictId(undefined);
                    setBlockId(undefined);
                    fetchDashboardData(clearedFilters);
                  }}
                  size="small"
                  sx={{ minWidth: 140, width: { xs: "100%", sm: "auto", md: "100%" } }}
                >
                  Clear
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 6 }}>
          <CircularProgress />
        </Box>
      ) : kpis ? (
        <>
          <Grid container spacing={2.5}>
            <KPICard
              title={`Events Planned · ${eventsPlannedLabel}`}
              value={eventsPlannedThisMonth}
              accent="amber"
              icon={<CalendarMonthIcon />}
            />
            <KPICard
              title="TLC Groups Formed"
              value={kpis.tlcGroupsFormed}
              accent="navy"
              icon={<GroupsIcon />}
            />
            <KPICard
              title="Teacher Leaders"
              value={kpis.teacherLeaders}
              accent="navy"
              icon={<SchoolIcon />}
            />
            <KPICard
              title="Registered Teachers (TLC members)"
              value={kpis.tlcMembers}
              icon={undefined}
              accent={"navy"}
            />
            <KPICard
              title="TIP teachers attended ≥1 TLC"
              value={kpis.tipTeachersAttendedAtLeastOne}
              icon={undefined}
              accent={"navy"}
            />
            <KPICard
              title="TLC Members"
              value={kpis.tlcMembers}
              accent="navy"
              icon={<PeopleIcon />}
            />
            <KPICard
              title="TLC Meets Planned"
              value={kpis.tlcMeetsPlanned}
              accent="amber"
              icon={<EventNoteIcon />}
            />
            <KPICard
              title="TLC Meets Conducted"
              value={kpis.tlcMeetsConducted}
              accent="green"
              icon={<EventAvailableIcon />}
            />
            <KPICard
              title="TLCs Cancelled"
              value={kpis.tlcsCancelled}
              accent="red"
              icon={<EventBusyIcon />}
            />
            <KPICard
              title="Masterclasses Held"
              value={kpis.masterclassesHeld}
              accent="green"
              icon={<CoPresentIcon />}
            />
            <KPICard
              title="Non-TIP teachers attended ≥1 TLC"
              value={kpis.nonTipTeachersAttendedAtLeastOne}
              icon={undefined}
              accent={"navy"}
            />
            <KPICard
              title="TLC Meets Held"
              value={kpis.tlcMeetsHeld}
              icon={undefined}
              accent={"navy"}
            />
            <KPICard
              title="% teachers attended >=3"
              value={`${(kpis.percentTeachersMin3 ?? 0).toFixed(1)}%`}
            />
            <KPICard
              title="masterclasses held"
              value={kpis.masterclassesHeld}
              icon={undefined}
              accent={"navy"}
            />
            <KPICard
              title="Unique teachers attending ≥60% of TLCs"
              value={kpis.uniqueTeachers60PercentOrMore}
              icon={undefined}
              accent={"navy"}
            />
            <KPICard
              title="Avg # teachers attending masterclasses"
              value={`${(kpis.avgTeachersPerMasterclass ?? 0).toFixed(1)}`}
            />
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
