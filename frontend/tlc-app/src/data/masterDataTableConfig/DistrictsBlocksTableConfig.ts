
import apiClient from '../../services/apiClient';
import type { District, Block } from '../../types';
import type { MasterDataPageConfig } from '../pageConfig/MasterDataPageConfig';
import {
  districtOptions,
  requiredText,
  requiredSelect,
} from '../pageConfig/MasterDataPageConfig';

export const districtsBlocksTableConfig: MasterDataPageConfig<District> = {
  key: 'districts-blocks',
  title: 'Districts & Blocks',
  subtitle:
    'Manage location masters in the required order: add districts first, then blocks mapped to a district.',
  entityLabel: 'District',

  table: {
    columns: [
      {
        key: 'code',
        label: 'Code',
        type: 'text',
        width: '15%',
        sortable: true,
        filterable: true,
        align: 'left',
        monospace: true,
      },
      {
        key: 'name',
        label: 'District Name',
        type: 'text',
        width: '50%',
        sortable: true,
        filterable: true,
        align: 'left',
      },
      {
        key: 'shortForm',
        label: 'Short Form',
        type: 'text',
        width: '35%',
        sortable: true,
        filterable: true,
        align: 'left',
        monospace: true,
      },
    ],
    defaultSort: { key: 'name', direction: 'asc' },
    rowsPerPageOptions: [10, 25, 50],
    defaultRowsPerPage: 25,
    emptyMessage: 'No districts found',
  },

  form: {
    fields: [
      {
        name: 'code',
        label: 'District Code',
        type: 'text',
        required: true,
        placeholder: 'e.g., MH',
        helperText: 'Max 2 characters, auto-uppercased',
        validation: (value: any) => {
          if (!value || value.trim().length === 0) return 'District Code is required';
          if (value.trim().length > 2) return 'District Code must be at most 2 characters';
          return true;
        },
        toPayload: (v: string) => v.trim().toUpperCase(),
        row: 1,
      },
      {
        name: 'name',
        label: 'District Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Mumbai',
        validation: requiredText('District Name'),
        toPayload: (v: string) => v.trim(),
        row: 1,
      },
      {
        name: 'shortForm',
        label: 'Short Form',
        type: 'text',
        optional: true,
        placeholder: 'e.g., MUM (defaults to Code if blank)',
        helperText: 'Max 6 characters, auto-uppercased. Defaults to Code if left blank.',
        validation: (value: any) => {
          if (!value || value.trim().length === 0) return true;
          if (value.trim().length > 6) return 'Short Form must be at most 6 characters';
          return true;
        },
        toPayload: (v: string) => (v?.trim() ? v.trim().toUpperCase() : undefined),
        row: 1,
      },
    ],
  },

  api: {
    list: () => apiClient.getDistricts(),
    create: (payload) => {
      const code = (payload.code as string).toUpperCase();
      return apiClient.createDistrict({
        code,
        name: payload.name as string,
        shortForm: payload.shortForm
          ? (payload.shortForm as string).toUpperCase()
          : code,
      });
    },
  },

  // ── Child entity: Blocks ───────────────────────────────────────────────────
  childEntity: {
    entityLabel: 'Block',
    subtitle: 'Each block must be linked to an existing district.',

    table: {
      columns: [
        {
          key: 'code',
          label: 'Block Code',
          type: 'text',
          width: '18%',
          sortable: true,
          filterable: true,
          align: 'left',
          monospace: true,
        },
        {
          key: 'name',
          label: 'Block Name',
          type: 'text',
          width: '42%',
          sortable: true,
          filterable: true,
          align: 'left',
        },
        {
          key: 'districtId',
          label: 'District',
          type: 'lookup',
          width: '40%',
          sortable: true,
          filterable: true,
          align: 'left',
        },
      ],
      defaultSort: { key: 'name', direction: 'asc' },
      rowsPerPageOptions: [10, 25, 50, 100],
      defaultRowsPerPage: 25,
      emptyMessage: 'No blocks found',
    },

    form: {
      fields: [
        {
          name: 'districtId',
          label: 'District',
          type: 'select',
          required: true,
          helperText: 'Select the district this block belongs to',
          optionsSource: districtOptions,
          validation: requiredSelect('District'),
          toPayload: Number,
          row: 1,
        },
        {
          name: 'code',
          label: 'Block Code',
          type: 'text',
          required: true,
          placeholder: 'e.g., BLK01',
          validation: requiredText('Block Code'),
          toPayload: (v: string) => v.trim().toUpperCase(),
          row: 2,
        },
        {
          name: 'name',
          label: 'Block Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., Andheri',
          validation: requiredText('Block Name'),
          toPayload: (v: string) => v.trim(),
          row: 2,
        },
      ],
    },

    api: {
      list: () => apiClient.getBlocks(),
      create: (payload) =>
        apiClient.createBlock({
          districtId: Number(payload.districtId),
          code: (payload.code as string).toUpperCase(),
          name: payload.name as string,
        }),
    },
  },
};