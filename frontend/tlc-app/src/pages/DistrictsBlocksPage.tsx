import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import { Add as AddIcon } from "@mui/icons-material";
import apiClient from "../services/apiClient";
import type { Block, District } from "../types";

type Notice = {
  severity: "success" | "error";
  text: string;
};

const DistrictsBlocksPage: React.FC = () => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDistrict, setSavingDistrict] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [districtSearch, setDistrictSearch] = useState("");
  const [blockSearch, setBlockSearch] = useState("");
  const [blockDistrictFilter, setBlockDistrictFilter] = useState("all");

  const [districtForm, setDistrictForm] = useState({
    code: "",
    name: "",
    shortForm: "",
  });
  const [blockForm, setBlockForm] = useState({
    districtId: "",
    code: "",
    name: "",
  });

  const districtName = (id: number) =>
    districts.find((d) => d.id === id)?.name ?? "-";

  const loadMasterData = async () => {
    setLoading(true);
    try {
      const [districtRes, blockRes] = await Promise.all([
        apiClient.getDistricts(),
        apiClient.getBlocks(),
      ]);
      setDistricts(districtRes.data || []);
      setBlocks(blockRes.data || []);
    } catch (error) {
      console.error(error);
      setNotice({
        severity: "error",
        text: "Failed to load districts and blocks.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  const getErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || error?.message || fallback;

  const createDistrict = async () => {
    const code = districtForm.code.trim().toUpperCase();
    const name = districtForm.name.trim();
    const shortForm = (districtForm.shortForm.trim() || code).toUpperCase();

    if (!code || !name) {
      setNotice({
        severity: "error",
        text: "District code and name are required.",
      });
      return;
    }

    setSavingDistrict(true);
    setNotice(null);
    try {
      await apiClient.createDistrict({ code, name, shortForm });
      setDistrictForm({ code: "", name: "", shortForm: "" });
      setNotice({ severity: "success", text: "District added successfully." });
      await loadMasterData();
    } catch (error: any) {
      setNotice({
        severity: "error",
        text: getErrorMessage(error, "Failed to add district."),
      });
    } finally {
      setSavingDistrict(false);
    }
  };

  const createBlock = async () => {
    const districtId = Number(blockForm.districtId);
    const code = blockForm.code.trim().toUpperCase();
    const name = blockForm.name.trim();

    if (!districtId || !code || !name) {
      setNotice({
        severity: "error",
        text: "District, block code, and block name are required.",
      });
      return;
    }

    setSavingBlock(true);
    setNotice(null);
    try {
      await apiClient.createBlock({ districtId, code, name });
      setBlockForm((prev) => ({ ...prev, code: "", name: "" }));
      setNotice({ severity: "success", text: "Block added successfully." });
      await loadMasterData();
    } catch (error: any) {
      setNotice({
        severity: "error",
        text: getErrorMessage(error, "Failed to add block."),
      });
    } finally {
      setSavingBlock(false);
    }
  };

  const districtBlockCount = (districtId: number) =>
    blocks.filter((block) => block.districtId === districtId).length;

  const normalizedDistrictSearch = districtSearch.trim().toLowerCase();
  const normalizedBlockSearch = blockSearch.trim().toLowerCase();
  const filteredDistricts = districts.filter((district) => {
    if (!normalizedDistrictSearch) return true;

    return [district.code, district.name, district.shortForm]
      .join(" ")
      .toLowerCase()
      .includes(normalizedDistrictSearch);
  });
  const filteredBlocks = blocks.filter((block) => {
    const matchesDistrict =
      blockDistrictFilter === "all" ||
      block.districtId === Number(blockDistrictFilter);
    const matchesSearch =
      !normalizedBlockSearch ||
      [block.code, block.name, districtName(block.districtId)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedBlockSearch);

    return matchesDistrict && matchesSearch;
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Districts & Blocks
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Manage location masters in the required order: districts first, then
          blocks mapped to a district.
        </Typography>
      </Box>

      {notice && (
        <Alert severity={notice.severity} sx={{ mb: 2 }}>
          {notice.text}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Add District
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Create the district before adding any blocks under it.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "140px 1fr 140px" },
              gap: 2,
            }}
          >
            <TextField
              label="Code"
              value={districtForm.code}
              onChange={(e) =>
                setDistrictForm((prev) => ({
                  ...prev,
                  code: e.target.value.toUpperCase(),
                }))
              }
              slotProps={{ htmlInput: { maxLength: 2 } }}
              required
            />
            <TextField
              label="District Name"
              value={districtForm.name}
              onChange={(e) =>
                setDistrictForm((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <TextField
              label="Short Form"
              value={districtForm.shortForm}
              onChange={(e) =>
                setDistrictForm((prev) => ({
                  ...prev,
                  shortForm: e.target.value.toUpperCase(),
                }))
              }
              slotProps={{ htmlInput: { maxLength: 6 } }}
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <Button
              variant="contained"
              startIcon={
                savingDistrict ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AddIcon />
                )
              }
              onClick={createDistrict}
              disabled={savingDistrict}
            >
              {savingDistrict ? "Saving..." : "Add District"}
            </Button>
          </Box>
        </Paper>

        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Add Block
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            A block must be linked to exactly one existing district.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 140px 1fr" },
              gap: 2,
            }}
          >
            <FormControl fullWidth required>
              <InputLabel>District</InputLabel>
              <Select
                value={blockForm.districtId}
                label="District"
                onChange={(e: SelectChangeEvent) =>
                  setBlockForm((prev) => ({
                    ...prev,
                    districtId: e.target.value,
                  }))
                }
              >
                {districts.map((district) => (
                  <MenuItem key={district.id} value={String(district.id)}>
                    {district.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Code"
              value={blockForm.code}
              onChange={(e) =>
                setBlockForm((prev) => ({
                  ...prev,
                  code: e.target.value.toUpperCase(),
                }))
              }
              required
            />
            <TextField
              label="Block Name"
              value={blockForm.name}
              onChange={(e) =>
                setBlockForm((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <Button
              variant="contained"
              startIcon={
                savingBlock ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AddIcon />
                )
              }
              onClick={createBlock}
              disabled={savingBlock || districts.length === 0}
            >
              {savingBlock ? "Saving..." : "Add Block"}
            </Button>
          </Box>
        </Paper>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 2,
          }}
        >
          <Paper>
            <Box sx={{ p: 2, display: "grid", gap: 1.5 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 2,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Districts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Showing {filteredDistricts.length} of {districts.length}
                </Typography>
              </Box>
              <TextField
                label="Filter districts"
                value={districtSearch}
                onChange={(e) => setDistrictSearch(e.target.value)}
                fullWidth
              />
            </Box>
            <Divider />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>District Code</TableCell>
                    <TableCell>District Name</TableCell>
                    <TableCell>Short Form</TableCell>
                    <TableCell align="right">Blocks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDistricts.map((district) => (
                    <TableRow key={district.id}>
                      <TableCell>{district.code}</TableCell>
                      <TableCell>{district.name}</TableCell>
                      <TableCell>{district.shortForm || "-"}</TableCell>
                      <TableCell align="right">
                        {districtBlockCount(district.id)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredDistricts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        No districts match the current filter
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper>
            <Box sx={{ p: 2, display: "grid", gap: 1.5 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 2,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Blocks
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Showing {filteredBlocks.length} of {blocks.length}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 220px" },
                  gap: 1.5,
                }}
              >
                <TextField
                  label="Filter blocks"
                  value={blockSearch}
                  onChange={(e) => setBlockSearch(e.target.value)}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>District</InputLabel>
                  <Select
                    value={blockDistrictFilter}
                    label="District"
                    onChange={(e: SelectChangeEvent) =>
                      setBlockDistrictFilter(e.target.value)
                    }
                  >
                    <MenuItem value="all">All Districts</MenuItem>
                    {districts.map((district) => (
                      <MenuItem key={district.id} value={String(district.id)}>
                        {district.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <Divider />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Block Code</TableCell>
                    <TableCell>Block Name</TableCell>
                    <TableCell>District</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBlocks.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell>{block.code}</TableCell>
                      <TableCell>{block.name}</TableCell>
                      <TableCell>{districtName(block.districtId)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredBlocks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                        No blocks match the current filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default DistrictsBlocksPage;
