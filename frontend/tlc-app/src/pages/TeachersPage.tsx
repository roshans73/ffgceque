import React, { useEffect, useState } from "react";
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
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { Add as AddIcon, Upload as UploadIcon } from "@mui/icons-material";
import apiClient from "../services/apiClient";
import type { Teacher, District, Block, Coach } from "../types";
import BulkUploadDialog from "../components/BulkUploadDialog";

interface TeacherForm {
  name: string;
  school: string;
  districtId: string;
  blockId: string;
  gender: string;
  mobile: string;
  email: string;
  isTipTeacher: boolean;
  yearsInTip: string;
  coachId: string;
}

const EMPTY_FORM: TeacherForm = {
  name: "",
  school: "",
  districtId: "",
  blockId: "",
  gender: "",
  mobile: "",
  email: "",
  isTipTeacher: false,
  yearsInTip: "",
  coachId: "",
};

const TeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [formBlocks, setFormBlocks] = useState<Block[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<TeacherForm>(EMPTY_FORM);

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    apiClient
      .getDistricts()
      .then((r) => setDistricts(r.data))
      .catch(console.error);
    apiClient
      .getCoaches()
      .then((r) => setCoaches(r.data))
      .catch(console.error);
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const r = await apiClient.getTeachers();
      setTeachers(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFormDistrictChange = async (e: SelectChangeEvent) => {
    setForm((p) => ({ ...p, districtId: e.target.value, blockId: "" }));
    if (e.target.value) {
      const r = await apiClient.getBlocks(Number(e.target.value));
      setFormBlocks(r.data);
    } else {
      setFormBlocks([]);
    }
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setFormBlocks([]);
    setAddOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.districtId || !form.blockId) {
      setFormError("Name, District, and Block are required");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await apiClient.createTeacher({
        name: form.name.trim(),
        school: form.school.trim(),
        districtId: Number(form.districtId),
        blockId: Number(form.blockId),
        gender: form.gender,
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        isTipTeacher: form.isTipTeacher,
        yearsInTip:
          form.isTipTeacher && form.yearsInTip ? Number(form.yearsInTip) : null,
        coachId: form.coachId ? Number(form.coachId) : null,
      });
      setAddOpen(false);
      loadTeachers();
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save teacher.";
      setFormError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const filtered = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.teacherCode.toLowerCase().includes(search.toLowerCase()) ||
      t.school.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Teachers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage teacher records — add individually or import from Excel
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setUploadOpen(true)}
          >
            Upload Excel
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Add Teacher
          </Button>
        </Box>
      </Box>

      {/* Search */}
      <TextField
        label="Search by name, code, or school"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3, width: { xs: "100%", sm: 360 } }}
        size="small"
      />

      {/* Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow
                sx={{ "& th": { fontWeight: 700, bgcolor: "grey.50" } }}
              >
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>School</TableCell>
                <TableCell>Gender</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>TIP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((t) => (
                <TableRow
                  key={t.id}
                  sx={{ "&:hover": { bgcolor: "action.hover" } }}
                >
                  <TableCell
                    sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                  >
                    {t.teacherCode}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{t.name}</TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {t.school}
                  </TableCell>
                  <TableCell>{t.gender}</TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {t.mobile}
                  </TableCell>
                  <TableCell>
                    {t.isTipTeacher && (
                      <Chip label="TIP" color="primary" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{ py: 4, color: "text.secondary" }}
                  >
                    No teachers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Add Teacher dialog ── */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Add Teacher
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <TextField
              label="Full Name"
              value={form.name}
              required
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="School"
              value={form.school}
              onChange={(e) =>
                setForm((p) => ({ ...p, school: e.target.value }))
              }
              fullWidth
            />

            <Box sx={{ display: "flex", gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>District</InputLabel>
                <Select
                  value={form.districtId}
                  label="District"
                  onChange={handleFormDistrictChange}
                >
                  {districts.map((d) => (
                    <MenuItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>Block</InputLabel>
                <Select
                  value={form.blockId}
                  label="Block"
                  disabled={!form.districtId}
                  onChange={(e: SelectChangeEvent) =>
                    setForm((p) => ({ ...p, blockId: e.target.value }))
                  }
                >
                  {formBlocks.map((b) => (
                    <MenuItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <FormControl sx={{ width: 120 }}>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={form.gender}
                  label="Gender"
                  onChange={(e: SelectChangeEvent) =>
                    setForm((p) => ({ ...p, gender: e.target.value }))
                  }
                >
                  <MenuItem value="M">Male</MenuItem>
                  <MenuItem value="F">Female</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Mobile"
                value={form.mobile}
                sx={{ flex: 1 }}
                onChange={(e) =>
                  setForm((p) => ({ ...p, mobile: e.target.value }))
                }
              />
              <TextField
                label="Email"
                type="email"
                value={form.email}
                sx={{ flex: 1 }}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>Coach (optional)</InputLabel>
              <Select
                value={form.coachId}
                label="Coach (optional)"
                onChange={(e: SelectChangeEvent) =>
                  setForm((p) => ({ ...p, coachId: e.target.value }))
                }
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {coaches.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.empNo})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider />

            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isTipTeacher}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        isTipTeacher: e.target.checked,
                        yearsInTip: "",
                      }))
                    }
                  />
                }
                label="TIP Teacher"
              />
              {form.isTipTeacher && (
                <TextField
                  label="Years in TIP"
                  type="number"
                  value={form.yearsInTip}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, yearsInTip: e.target.value }))
                  }
                  sx={{ width: 140 }}
                  slotProps={{ htmlInput: { min: 0, max: 20 } }}
                />
              )}
            </Box>
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setAddOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={
              saving ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Bulk Upload dialog ── */}
      <BulkUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Teachers"
        columnHint="Name · School · DistrictId · BlockId · Gender · Mobile · Email · IsTipTeacher (Y/N) · YearsInTip"
        onUpload={(file) => apiClient.uploadTeachers(file)}
        onSuccess={loadTeachers}
      />
    </Box>
  );
};

export default TeachersPage;
