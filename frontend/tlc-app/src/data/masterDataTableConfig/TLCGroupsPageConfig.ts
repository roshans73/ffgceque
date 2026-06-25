import apiClient from '../../services/apiClient';
import type { TLCGroup } from '../../types';
import type { MasterDataPageConfig } from '../pageConfig/MasterDataPageConfig';
import { districtOptions, blockOptionsDependentOnDistrict, teacherOptions, requiredText, requiredSelect } from '../pageConfig/MasterDataPageConfig';

export const tlcGroupsTableConfig: MasterDataPageConfig<TLCGroup> = {
  key: 'tlcgroups',
  title: 'TLC Groups',
  subtitle: 'Manage TLC group records — add individually or import from Excel',
  entityLabel: 'TLC Group',

  table: {
    columns: [
      { key: 'tlcGroupCode', label: 'Group Code', type: 'text', width: '14%', sortable: true, filterable: true, align: 'left', monospace: true },
      { key: 'districtId', label: 'District', type: 'lookup', width: '13%', sortable: true, filterable: true, align: 'left' },
      { key: 'blockId', label: 'Block', type: 'lookup', width: '13%', sortable: true, filterable: true, align: 'left' },
      { key: 'location', label: 'Location', type: 'text', width: '16%', sortable: true, filterable: true, align: 'left' },
      { key: 'dateFormed', label: 'Date Formed', type: 'date', width: '13%', sortable: true, filterable: true, align: 'center' },
      { key: 'teacherLeaderId', label: 'Teacher Leader', type: 'lookup', width: '19%', sortable: true, filterable: true, align: 'left' },
      { key: 'isActive', label: 'Active', type: 'boolean', width: '12%', sortable: true, filterable: true, align: 'center' },
    ],
    defaultSort: { key: 'tlcGroupCode', direction: 'asc' },
    rowsPerPageOptions: [10, 25, 50, 100],
    defaultRowsPerPage: 25,
    emptyMessage: 'No TLC groups found',
  },

  form: {
    fields: [
      {
        name: 'districtId',
        label: 'District',
        type: 'select',
        required: true,
        helperText: 'Select the district where the TLC group is formed',
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
        name: 'location',
        label: 'Location',
        type: 'text',
        required: true,
        placeholder: 'e.g., Primary School, Community Center',
        validation: requiredText('Location'),
        toPayload: (v: string) => v.trim(),
        row: 2,
      },
      {
        name: 'dateFormed',
        label: 'Date Formed',
        type: 'date',
        required: true,
        helperText: 'Select the date when the TLC group was formed',
        validation: (value) => (!value ? 'Date Formed is required' : true),
        row: 2,
      },
      {
        name: 'groupShortForm',
        label: 'Group Short Form',
        type: 'text',
        required: true,
        placeholder: 'e.g., SH, AL, BP',
        helperText: '2-4 letter identifier appended to the auto-generated group code (format: XXnn-YY)',
        validation: (value) => {
          if (!value || typeof value !== 'string') return 'Group short form is required';
          const trimmed = value.trim();
          if (trimmed.length < 2) return 'Group short form must be at least 2 characters';
          if (trimmed.length > 4) return 'Group short form must be at most 4 characters';
          if (!/^[A-Z]+$/.test(trimmed.toUpperCase())) return 'Group short form must contain only letters';
          return true;
        },
        toPayload: (v: string) => v.trim().toUpperCase(),
        row: 3,
      },
      {
        name: 'teacherLeaderId',
        label: 'Teacher Leader',
        type: 'select',
        required: true,
        helperText: 'Select the teacher who will lead this TLC group',
        optionsSource: teacherOptions,
        validation: requiredSelect('Teacher Leader'),
        toPayload: Number,
        row: 4,
      },
      {
        name: 'isActive',
        label: 'Active',
        type: 'checkbox',
        helperText: 'Inactive groups are excluded from new event/attendance assignment',
        toPayload: Boolean,
        row: 5,
      },
    ],
  },

  api: {
    list: () => apiClient.getTLCGroups(),
    create: (payload) => apiClient.createTLCGroup(payload as any),
    upload: (file) => apiClient.uploadTLCGroups(file),
  },

  bulkUpload: {
    enabled: true,
    columnHint: 'DistrictId · BlockId · Location · DateFormed · GroupShortForm · TeacherLeaderId',
  },
};