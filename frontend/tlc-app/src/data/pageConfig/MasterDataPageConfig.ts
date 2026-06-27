import apiClient from '../../services/apiClient';
import type { Coach, Teacher, TLCGroup, District, Block } from '../../types';

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'lookup';
  width?: string | number;
  sortable?: boolean;
  filterable?: boolean;
  align?: 'left' | 'center' | 'right';
  resolve?: (row: T, lookups: Record<string, LookupOption[]>) => React.ReactNode;
  monospace?: boolean;
}

export interface LookupOption {
  label: string;
  value: string | number;
  caption?: string;
}

export type OptionsSource =
  | { kind: 'static'; options: LookupOption[] }
  | {
      kind: 'api';
      fetch: (signal?: AbortSignal) => Promise<{ data: any[] }>; // added signal
      map: (item: any) => LookupOption;
    }
  | {
      kind: 'api-dependent';
      dependsOn: string;
      fetch: (parentValue: string | number, signal?: AbortSignal) => Promise<{ data: any[] }>; // added signal
      map: (item: any) => LookupOption;
    };

export interface MasterFormField<T = any> {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'select' | 'date' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  optionsSource?: OptionsSource;
  validation?: (value: any, form: Record<string, any>) => boolean | string;
  toPayload?: (value: any) => any;
  row?: number;
  optional?: boolean;
}

export interface MasterDataPageConfig<T extends { id: number } = any> {
  key: string;
  title: string;
  subtitle: string;
  entityLabel: string;
  table: {
    columns: TableColumn<T>[];
    defaultSort?: { key: keyof T; direction: 'asc' | 'desc' };
    rowsPerPageOptions?: number[];
    defaultRowsPerPage?: number;
    emptyMessage?: string;
  };
  form: {
    fields: MasterFormField<T>[];
    validateForm?: (form: Record<string, any>) => string | null;
  };
  api: {
    list: () => Promise<{ data: T[] }>;
    create: (payload: Record<string, any>) => Promise<any>;
    upload?: (file: File) => Promise<any>;
  };
  bulkUpload?: {
    enabled: boolean;
    columnHint: string;
  };
    childEntity?: {
    entityLabel: string;
    subtitle: string;
    table: MasterDataPageConfig['table'];
    form: MasterDataPageConfig['form'];
    api: Pick<MasterDataPageConfig['api'], 'list' | 'create'>;
  };
}

// ── Shared option sources ─────────────────────────────────────────────────────
// Each fetch now accepts and forwards the AbortSignal to apiClient so that
// navigating away on mobile actually cancels the XHR, not just the JS promise.

export const districtOptions: OptionsSource = {
  kind: 'api',
  fetch: (signal) => apiClient.getDistricts(signal),
  map: (d: District) => ({ label: d.name, value: d.id }),
};

export const blockOptionsDependentOnDistrict: OptionsSource = {
  kind: 'api-dependent',
  dependsOn: 'districtId',
  fetch: (districtId, signal) => apiClient.getBlocks(Number(districtId), signal),
  map: (b: Block) => ({ label: b.name, value: b.id }),
};

export const allBlockOptions: OptionsSource = {
  kind: 'api',
  fetch: (signal) => apiClient.getBlocks(undefined, signal),
  map: (b: Block) => ({ label: b.name, value: b.id }),
};

export const teacherOptions: OptionsSource = {
  kind: 'api',
  fetch: (signal) => apiClient.getTeachers(signal),
  map: (t: Teacher) => ({ label: t.name, value: t.id, caption: t.teacherCode }),
};

export const coachOptions: OptionsSource = {
  kind: 'api',
  fetch: (signal) => apiClient.getCoaches(undefined, undefined, signal),
  map: (c: Coach) => ({ label: c.name, value: c.id, caption: c.empNo }),
};

export const tlcGroupOptions: OptionsSource = {
  kind: 'api',
  fetch: (signal) => apiClient.getTLCGroups(signal),
  map: (g: TLCGroup) => ({ label: g.tlcGroupCode, value: g.id }),
};

// ── Validators ────────────────────────────────────────────────────────────────

export const requiredText = (label: string) => (value: any) => {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return `${label} is required`;
  }
  return true;
};

export const requiredSelect = (label: string) => (value: any) => {
  if (value === '' || value === null || value === undefined) {
    return `${label} is required`;
  }
  return true;
};