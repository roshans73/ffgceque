import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { WifiOff as WifiOffIcon, CloudOff as CloudOffIcon } from '@mui/icons-material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import BulkUploadDialog from '../../components/BulkUploadDialog';
import type {
  LookupOption,
  MasterDataPageConfig,
  MasterFormField,
} from '../../data/pageConfig/MasterDataPageConfig';

type FormState = Record<string, any>;

// ── EntitySectionConfig ────────────────────────────────────────────────────────
// A normalised slice of config that EntitySection works with whether it comes
// from the top-level config or from config.childEntity.
interface EntitySectionConfig {
  entityLabel: string;
  subtitle: string;
  table: MasterDataPageConfig['table'];
  form: MasterDataPageConfig['form'];
  api: Pick<MasterDataPageConfig['api'], 'list' | 'create'>;
  bulkUpload?: MasterDataPageConfig['bulkUpload'];
  // upload is optional — only present when this section has bulk-upload enabled
  upload?: (file: File) => Promise<any>;
}

interface MasterDataPageProps {
  config: MasterDataPageConfig<any>;
}

// ── Timeout wrapper ────────────────────────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms = 10_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new DOMException('Request timed out', 'TimeoutError')),
      ms,
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// ── Safe fetch helpers ─────────────────────────────────────────────────────────
async function safeOptionsFetch(
  fetch: (signal?: AbortSignal) => Promise<{ data: any[] }>,
  map: (item: any) => LookupOption,
  signal?: AbortSignal,
): Promise<LookupOption[]> {
  if (!navigator.onLine) return [];
  if (signal?.aborted) return [];
  try {
    const r = await withTimeout(fetch(signal));
    if (signal?.aborted) return [];
    return Array.isArray(r?.data) ? r.data.map(map) : [];
  } catch {
    return [];
  }
}

async function safeListFetch<T>(
  list: () => Promise<{ data: T[] }>,
  signal?: AbortSignal,
): Promise<{ data: T[]; error: boolean; offline: boolean }> {
  if (!navigator.onLine) return { data: [], error: false, offline: true };
  if (signal?.aborted) return { data: [], error: false, offline: false };
  try {
    const r = await withTimeout(list());
    if (signal?.aborted) return { data: [], error: false, offline: false };
    return { data: Array.isArray(r?.data) ? r.data : [], error: false, offline: false };
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === 'AbortError' || err.name === 'TimeoutError')
    ) {
      return { data: [], error: false, offline: false };
    }
    return { data: [], error: true, offline: false };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EntitySection — self-contained: owns its own rows, lookups, form, dialog state
// ═══════════════════════════════════════════════════════════════════════════════
interface EntitySectionProps {
  section: EntitySectionConfig;
  isOffline: boolean;
  // Parent passes its own abort ref so unmounting the parent also cancels
  // all in-flight requests owned by child sections.
  parentMountedRef: React.MutableRefObject<boolean>;
  // False on single-entity pages — the page h4 title already serves as the
  // header, so the section must not render a duplicate h5 beneath it.
  showSectionHeader: boolean;
}

function EntitySection({ section, isOffline, parentMountedRef, showSectionHeader }: EntitySectionProps) {
  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [lookups, setLookups]                   = useState<Record<string, LookupOption[]>>({});
  const [lookupsLoading, setLookupsLoading]     = useState(true);
  const [dependentOptions, setDependentOptions] = useState<Record<string, LookupOption[]>>({});

  const [searchQuery, setSearchQuery]     = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [page, setPage]                   = useState(0);
  const [rowsPerPage, setRowsPerPage]     = useState(section.table.defaultRowsPerPage ?? 25);

  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');
  const [form, setForm]             = useState<FormState>({});
  const [uploadOpen, setUploadOpen] = useState(false);

  const mountedRef     = useRef(true);
  const listAbortRef   = useRef<AbortController | null>(null);
  const lookupAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      listAbortRef.current?.abort();
      lookupAbortRef.current?.abort();
    };
  }, []);

  const fieldsByName = useMemo(() => {
    const map: Record<string, MasterFormField> = {};
    section.form.fields.forEach((f) => { map[f.name] = f; });
    return map;
  }, [section]);

  // ── Load rows ──────────────────────────────────────────────────────────────
  const loadRows = useCallback(async () => {
    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    if (!mountedRef.current || !parentMountedRef.current) return;
    setLoading(true);
    setLoadError(false);

    const result = await safeListFetch(section.api.list, controller.signal);

    if (!mountedRef.current || controller.signal.aborted) return;
    setRows(result.data);
    setLoadError(result.error);
    setLoading(false);
  }, [section, parentMountedRef]);

  // ── Load independent lookups ───────────────────────────────────────────────
  useEffect(() => {
    const loadLookups = async () => {
      if (!mountedRef.current) return;

      lookupAbortRef.current?.abort();
      const controller = new AbortController();
      lookupAbortRef.current = controller;

      setLookupsLoading(true);
      const next: Record<string, LookupOption[]> = {};

      await Promise.all(
        section.form.fields.map(async (field) => {
          const src = field.optionsSource;
          if (!src) return;
          if (src.kind === 'static') { next[field.name] = src.options; return; }
          if (src.kind === 'api') {
            const apiFetch = src.fetch as (signal?: AbortSignal) => Promise<{ data: any[] }>;
            next[field.name] = await safeOptionsFetch(apiFetch, src.map, controller.signal);
          }
        }),
      );

      if (!mountedRef.current || controller.signal.aborted) return;
      setLookups(next);
      setLookupsLoading(false);
    };

    loadLookups();
    loadRows();
  }, [section, loadRows]);

  // ── Dependent options ──────────────────────────────────────────────────────
  const loadDependentOptions = async (field: MasterFormField, parentValue: string | number) => {
    const src = field.optionsSource;
    if (!src || src.kind !== 'api-dependent') return;
    if (!parentValue || !navigator.onLine) {
      if (mountedRef.current) setDependentOptions((p) => ({ ...p, [field.name]: [] }));
      return;
    }
    const opts = await safeOptionsFetch((signal) => src.fetch(parentValue, signal), src.map);
    if (mountedRef.current) setDependentOptions((p) => ({ ...p, [field.name]: opts }));
  };

  const optionsFor = (field: MasterFormField): LookupOption[] => {
    const src = field.optionsSource;
    if (!src) return [];
    if (src.kind === 'api-dependent') return dependentOptions[field.name] ?? [];
    return lookups[field.name] ?? [];
  };

  // ── Cell resolution ────────────────────────────────────────────────────────
  const resolveCellValue = (row: any, column: typeof section.table.columns[number]): string => {
    if (column.resolve) return String(column.resolve(row, lookups) ?? '—');
    const raw = row[column.key as string];
    if (column.type === 'lookup') {
      const matchingField = fieldsByName[column.key as string];
      const options = matchingField ? lookups[matchingField.name] : undefined;
      const match = options?.find((o) => String(o.value) === String(raw));
      return match?.label ?? '—';
    }
    if (column.type === 'date' && raw) return new Date(raw).toLocaleDateString();
    if (column.type === 'boolean') return raw ? 'Yes' : 'No';
    return raw ?? '—';
  };

  // ── Filtering / pagination ─────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (q) {
        const hit = section.table.columns.some((col) =>
          String(resolveCellValue(row, col)).toLowerCase().includes(q),
        );
        if (!hit) return false;
      }
      for (const [colKey, filterVal] of Object.entries(columnFilters)) {
        if (!filterVal) continue;
        const col = section.table.columns.find((c) => c.key === colKey);
        if (!col) continue;
        if (!String(resolveCellValue(row, col)).toLowerCase().includes(filterVal.toLowerCase()))
          return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, searchQuery, columnFilters, lookups]);

  useEffect(() => { setPage(0); }, [searchQuery, columnFilters]);

  const paginatedRows = useMemo(
    () => filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredRows, page, rowsPerPage],
  );

  const filterableColumns = section.table.columns.filter((c) => c.filterable);

  // ── Form helpers ───────────────────────────────────────────────────────────
  const buildForm = (source?: any): FormState => {
    const f: FormState = {};
    section.form.fields.forEach((field) => {
      if (source) {
        const raw = source[field.name];
        f[field.name] = raw !== undefined && raw !== null
          ? (field.type === 'checkbox' ? Boolean(raw) : String(raw))
          : (field.type === 'checkbox' ? false : '');
      } else {
        f[field.name] = field.type === 'checkbox' ? false : '';
      }
    });
    return f;
  };

  const openAdd = () => {
    setEditingRow(null);
    setForm(buildForm());
    setFormError('');
    setDependentOptions({});
    setDialogMode('add');
  };

  const openEdit = (row: any) => {
    setEditingRow(row);
    setForm(buildForm(row));
    setFormError('');
    setDependentOptions({});
    section.form.fields.forEach((field) => {
      if (field.optionsSource?.kind === 'api-dependent') {
        const parentVal = row[field.optionsSource.dependsOn];
        if (parentVal) loadDependentOptions(field, parentVal);
      }
    });
    setDialogMode('edit');
  };

  const closeDialog = () => { setDialogMode(null); setEditingRow(null); };

  const handleFieldChange = (field: MasterFormField, rawValue: any) => {
    setForm((prev) => {
      const next = { ...prev, [field.name]: rawValue };
      section.form.fields.forEach((other) => {
        if (
          other.optionsSource?.kind === 'api-dependent' &&
          other.optionsSource.dependsOn === field.name
        ) {
          next[other.name] = '';
          loadDependentOptions(other, rawValue);
        }
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!navigator.onLine) {
      setFormError('You are offline. Please reconnect to save changes.');
      return;
    }

    for (const field of section.form.fields) {
      const value = form[field.name];
      const isEmpty =
        value === '' || value === null || value === undefined ||
        (typeof value === 'string' && value.trim() === '');
      if (field.required && !field.optional && isEmpty) {
        setFormError(`${field.label} is required`);
        return;
      }
      if (field.validation && !isEmpty) {
        const result = field.validation(value, form);
        if (result !== true) {
          setFormError(typeof result === 'string' ? result : `${field.label} is invalid`);
          return;
        }
      }
    }

    if (section.form.validateForm) {
      const err = section.form.validateForm(form);
      if (err) { setFormError(err); return; }
    }

    const payload: Record<string, any> = {};
    section.form.fields.forEach((field) => {
      payload[field.name] = field.toPayload ? field.toPayload(form[field.name]) : form[field.name];
    });

    setSaving(true);
    setFormError('');
    try {
      await withTimeout(section.api.create(payload));
      if (!mountedRef.current) return;
      closeDialog();
      loadRows();
    } catch (err) {
      if (!mountedRef.current) return;
      const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
      setFormError(
        isTimeout
          ? 'Save timed out. Please check your connection and try again.'
          : `Failed to save ${section.entityLabel.toLowerCase()}. Please check your connection and try again.`,
      );
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const fieldRows = useMemo(() => {
    const grouped: Record<number, MasterFormField[]> = {};
    let autoRow = 1000;
    section.form.fields.forEach((field) => {
      const rowKey = field.row ?? autoRow++;
      if (!grouped[rowKey]) grouped[rowKey] = [];
      grouped[rowKey].push(field);
    });
    return Object.values(grouped);
  }, [section]);

  // ── Form field renderer ────────────────────────────────────────────────────
  const renderFormField = (field: MasterFormField) => {
    const value = form[field.name] ?? (field.type === 'checkbox' ? false : '');

    if (field.type === 'checkbox') {
      return (
        <FormControlLabel
          key={field.name}
          control={
            <Checkbox
              checked={!!value}
              onChange={(e) => handleFieldChange(field, e.target.checked)}
            />
          }
          label={
            <Box>
              <Typography variant="body2">{field.label}</Typography>
              {field.helperText && (
                <Typography variant="caption" color="text.secondary">
                  {field.helperText}
                </Typography>
              )}
            </Box>
          }
        />
      );
    }

    if (field.type === 'select') {
      const options = optionsFor(field);
      const parentField =
        field.optionsSource?.kind === 'api-dependent'
          ? field.optionsSource.dependsOn
          : undefined;
      const disabled = !!parentField && !form[parentField];
      return (
        <FormControl
          key={field.name}
          fullWidth
          required={field.required && !field.optional}
          disabled={disabled}
          sx={{ flex: 1 }}
        >
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={value}
            label={field.label}
            onChange={(e: SelectChangeEvent) => handleFieldChange(field, e.target.value)}
          >
            {options.length === 0 && (
              <MenuItem value="" disabled>
                {isOffline ? 'Unavailable offline' : 'No options available'}
              </MenuItem>
            )}
            {options.map((opt) => (
              <MenuItem key={opt.value} value={String(opt.value)}>
                {opt.label}
                {opt.caption && (
                  <Typography
                    component="span"
                    sx={{ ml: 1, fontSize: '0.75rem', color: 'text.secondary' }}
                  >
                    {opt.caption}
                  </Typography>
                )}
              </MenuItem>
            ))}
          </Select>
          {field.helperText && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
              {field.helperText}
            </Typography>
          )}
        </FormControl>
      );
    }

    return (
      <TextField
        key={field.name}
        label={field.label}
        type={
          field.type === 'date' ? 'date'
          : field.type === 'number' ? 'number'
          : field.type === 'email' ? 'email'
          : 'text'
        }
        value={value}
        required={field.required && !field.optional}
        placeholder={field.placeholder}
        helperText={field.helperText}
        sx={{ flex: 1 }}
        slotProps={field.type === 'date' ? { inputLabel: { shrink: true } } : undefined}
        onChange={(e) => handleFieldChange(field, e.target.value)}
      />
    );
  };

  // ── Table body ─────────────────────────────────────────────────────────────
  const renderTableBody = () => {
    const colSpan = section.table.columns.length + 2;

    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
            <CircularProgress size={32} />
          </TableCell>
        </TableRow>
      );
    }

    if (isOffline) {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
            <WifiOffIcon
              sx={{ fontSize: 36, color: 'text.disabled', display: 'block', mx: 'auto', mb: 1 }}
            />
            <Typography color="text.secondary" variant="body2" sx={{ mb: 0.5 }}>
              You're offline
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Data will load automatically when you reconnect
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    if (loadError) {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} align="center" sx={{ py: 6 }}>
            <CloudOffIcon
              sx={{ fontSize: 36, color: 'text.disabled', display: 'block', mx: 'auto', mb: 1 }}
            />
            <Typography color="text.secondary" variant="body2" sx={{ mb: 1.5 }}>
              Could not load data. Check your connection and try again.
            </Typography>
            <Button size="small" variant="outlined" onClick={loadRows}>
              Retry
            </Button>
          </TableCell>
        </TableRow>
      );
    }

    if (paginatedRows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} align="center" sx={{ py: 6, color: 'text.secondary' }}>
            {section.table.emptyMessage ?? 'No records found'}
          </TableCell>
        </TableRow>
      );
    }

    return paginatedRows.map((row, idx) => (
      <TableRow key={row.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
        <TableCell
          align="center"
          sx={{ width: 56, color: 'text.secondary', fontSize: '0.8rem' }}
        >
          {page * rowsPerPage + idx + 1}
        </TableCell>
        {section.table.columns.map((col) => (
          <TableCell
            key={col.key as string}
            align={col.align || 'left'}
            sx={{
              width: col.width,
              fontFamily: col.monospace ? 'monospace' : 'inherit',
              fontWeight: col.monospace ? 600 : 'inherit',
            }}
          >
            {resolveCellValue(row, col)}
          </TableCell>
        ))}
        <TableCell align="center" sx={{ width: 72 }}>
          <Tooltip title={`Edit ${section.entityLabel}`}>
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
    ));
  };

  const isOpen = dialogMode !== null;

  return (
    <Box>
      {/* Section header + action buttons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {showSectionHeader ? (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {section.entityLabel}s
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {section.subtitle}
            </Typography>
          </Box>
        ) : (
          // Spacer so the action buttons still align to the right
          <Box />
        )}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {section.bulkUpload?.enabled && section.upload && (
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setUploadOpen(true)}
              disabled={isOffline}
            >
              Upload Excel
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAdd}
            disabled={lookupsLoading || isOffline}
          >
            Add {section.entityLabel}
          </Button>
        </Box>
      </Box>

      {/* Search + column filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder={`Search ${section.entityLabel.toLowerCase()}s…`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: 220, flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        {filterableColumns
          .filter((col) => col.type === 'lookup' || col.type === 'boolean')
          .map((col) => {
            const fieldName = col.key as string;
            const options =
              col.type === 'boolean'
                ? [{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }]
                : (lookups[fieldName]?.map((o) => ({ label: o.label, value: o.label })) ?? []);
            return (
              <TextField
                key={fieldName}
                select
                size="small"
                label={col.label}
                value={columnFilters[fieldName] ?? ''}
                onChange={(e) =>
                  setColumnFilters((prev) => ({ ...prev, [fieldName]: e.target.value }))
                }
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">All</MenuItem>
                {options.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            );
          })}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ ml: 'auto', whiteSpace: 'nowrap' }}
        >
          {filteredRows.length} of {rows.length} record{rows.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                <TableCell align="center" sx={{ width: 56 }}>#</TableCell>
                {section.table.columns.map((col) => (
                  <TableCell
                    key={col.key as string}
                    align={col.align || 'left'}
                    sx={{ width: col.width }}
                  >
                    {col.label}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ width: 72 }}>Edit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{renderTableBody()}</TableBody>
          </Table>
        </TableContainer>

        {!loading && !loadError && !isOffline && rows.length > 0 && (
          <TablePagination
            component="div"
            count={filteredRows.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={section.table.rowsPerPageOptions ?? [10, 25, 50, 100]}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        )}
      </Paper>

      {/* Add / Edit dialog */}
      <Dialog open={isOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {dialogMode === 'edit'
              ? `Edit ${section.entityLabel}`
              : `Add ${section.entityLabel}`}
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {isOffline && (
              <Alert severity="warning" icon={<WifiOffIcon fontSize="small" />}>
                You're offline — changes cannot be saved right now.
              </Alert>
            )}
            {formError && <Alert severity="error">{formError}</Alert>}
            {fieldRows.map((rowFields, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {rowFields.map(renderFormField)}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || isOffline}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Upload */}
      {section.bulkUpload?.enabled && section.upload && (
        <BulkUploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          title={`Upload ${section.entityLabel}s`}
          columnHint={section.bulkUpload.columnHint}
          onUpload={section.upload}
          onSuccess={loadRows}
        />
      )}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MasterDataPage — orchestrates one or two EntitySection instances
// ═══════════════════════════════════════════════════════════════════════════════
function MasterDataPage({ config }: MasterDataPageProps) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const onOnline  = () => { if (mountedRef.current) setIsOffline(false); };
    const onOffline = () => { if (mountedRef.current) setIsOffline(true); };
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Normalise top-level config into the EntitySectionConfig shape
  const primarySection: EntitySectionConfig = {
    entityLabel: config.entityLabel,
    subtitle:    config.subtitle,
    table:       config.table,
    form:        config.form,
    api:         { list: config.api.list, create: config.api.create },
    bulkUpload:  config.bulkUpload,
    upload:      config.api.upload,
  };

  // childEntity is already in EntitySectionConfig shape by type contract
  const childSection: EntitySectionConfig | null = config.childEntity ?? null;

  return (
    <Box>
      {/* Page-level offline banner */}
      {isOffline && (
        <Alert
          severity="warning"
          icon={<WifiOffIcon fontSize="small" />}
          sx={{ mb: 3 }}
        >
          You're offline — data cannot be loaded or saved until you reconnect.
        </Alert>
      )}

      {/* Page title */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {config.title}
        </Typography>
        {/* Only show the page subtitle when there is no child entity.
            When there IS a child, each EntitySection renders its own subtitle,
            so the page-level one would be redundant. */}
        {!childSection && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {config.subtitle}
          </Typography>
        )}
      </Box>

      {/* Primary entity section — no section header; page h4 already titles it */}
      <EntitySection
        section={primarySection}
        isOffline={isOffline}
        parentMountedRef={mountedRef}
        showSectionHeader={false}
      />

      {/* Child entity section — rendered only when childEntity is defined */}
      {childSection && (
        <>
          <Divider sx={{ my: 4 }} />
          <EntitySection
            section={childSection}
            isOffline={isOffline}
            parentMountedRef={mountedRef}
            showSectionHeader={true}
          />
        </>
      )}
    </Box>
  );
}

export default MasterDataPage;