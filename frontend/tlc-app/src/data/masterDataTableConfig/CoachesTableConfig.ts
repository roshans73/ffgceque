import apiClient from '../../services/apiClient';
import type { Coach } from '../../types';
import type { MasterDataPageConfig } from '../pageConfig/MasterDataPageConfig';
import { districtOptions, blockOptionsDependentOnDistrict, requiredText, requiredSelect } from '../pageConfig/MasterDataPageConfig';

export const coachesTableConfig: MasterDataPageConfig<Coach> = {
  key: 'coaches',
  title: 'Coaches',
  subtitle: 'Manage coach records — add individually or import from Excel',
  entityLabel: 'Coach',

  table: {
    columns: [
      { key: 'empNo', label: 'Employee No', type: 'text', width: '18%', sortable: true, filterable: true, align: 'left' },
      { key: 'name', label: 'Name', type: 'text', width: '26%', sortable: true, filterable: true, align: 'left' },
      { key: 'districtId', label: 'District', type: 'lookup', width: '20%', sortable: true, filterable: true, align: 'left' },
      { key: 'blockId', label: 'Block', type: 'lookup', width: '20%', sortable: true, filterable: true, align: 'left' },
      { key: 'isActive', label: 'Active', type: 'boolean', width: '16%', sortable: true, filterable: true, align: 'center' },
    ],
    defaultSort: { key: 'name', direction: 'asc' },
    rowsPerPageOptions: [10, 25, 50, 100],
    defaultRowsPerPage: 25,
    emptyMessage: 'No coaches found',
  },

  form: {
    fields: [
      {
        name: 'districtId',
        label: 'District',
        type: 'select',
        required: true,
        helperText: 'Select the district where the coach is based',
        optionsSource: districtOptions,
        validation: requiredSelect('District'),
        toPayload: Number,
        row: 1,
      },
      {
        name: 'blockId',
        label: 'Block',
        type: 'select',
        required: true,
        helperText: 'Select the block within the district',
        optionsSource: blockOptionsDependentOnDistrict,
        validation: requiredSelect('Block'),
        toPayload: Number,
        row: 1,
      },
      {
        name: 'empNo',
        label: 'Employee No',
        type: 'text',
        required: true,
        placeholder: 'e.g., EMP001',
        validation: requiredText('Employee No'),
        toPayload: (v: string) => v.trim(),
        row: 2,
      },
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        required: true,
        placeholder: 'Enter coach name',
        validation: requiredText('Name'),
        toPayload: (v: string) => v.trim(),
        row: 2,
      },
      {
        name: 'isActive',
        label: 'Active',
        type: 'checkbox',
        helperText: 'Inactive coaches are excluded from the "Referred By" dropdown on Teacher records',
        toPayload: Boolean,
      },
    ],
  },

  api: {
    list: (signal) => apiClient.getCoaches(undefined, undefined, signal),
    create: (payload) => apiClient.createCoach(payload as any),
    upload: (file) => apiClient.uploadCoaches(file),
  },

  bulkUpload: {
    enabled: true,
    columnHint: 'DistrictId · BlockId · EmpNo · Name · IsActive',
  },
};