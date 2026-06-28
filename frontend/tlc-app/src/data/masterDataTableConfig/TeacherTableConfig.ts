import apiClient from '../../services/apiClient';
import type { Teacher } from '../../types';
import type { MasterDataPageConfig } from '../pageConfig/MasterDataPageConfig';
import {
  districtOptions,
  blockOptionsDependentOnDistrict,
  coachOptions,
  tlcGroupOptions,
  requiredText,
  requiredSelect,
} from '../pageConfig/MasterDataPageConfig';

export const teachersTableConfig: MasterDataPageConfig<Teacher> = {
  key: 'teachers',
  title: 'Teachers',
  subtitle: 'Manage teacher records — add individually or import from Excel',
  entityLabel: 'Teacher',

  table: {
    columns: [
      { key: 'teacherCode', label: 'Code', type: 'text', width: '9%', sortable: true, filterable: true, align: 'left', monospace: true },
      { key: 'name', label: 'Name', type: 'text', width: '14%', sortable: true, filterable: true, align: 'left' },
      { key: 'school', label: 'School', type: 'text', width: '14%', sortable: true, filterable: true, align: 'left' },
      { key: 'districtId', label: 'District', type: 'lookup', width: '10%', sortable: true, filterable: true, align: 'left' },
      { key: 'blockId', label: 'Block', type: 'lookup', width: '10%', sortable: true, filterable: true, align: 'left' },
      { key: 'tlcGroupId', label: 'TLC Group', type: 'lookup', width: '10%', sortable: true, filterable: true, align: 'left' },
      { key: 'coachId', label: 'Referred By', type: 'lookup', width: '10%', sortable: true, filterable: true, align: 'left' },
      { key: 'gender', label: 'Gender', type: 'text', width: '5%', sortable: true, filterable: true, align: 'center' },
      { key: 'mobile', label: 'Mobile', type: 'text', width: '9%', sortable: false, filterable: false, align: 'left' },
      { key: 'email', label: 'Email', type: 'text', width: '13%', sortable: false, filterable: true, align: 'left' },
      { key: 'isTipTeacher', label: 'TIP Teacher', type: 'boolean', width: '8%', sortable: true, filterable: true, align: 'center' },
      { key: 'registeredDate', label: 'Registered', type: 'date', width: '10%', sortable: true, filterable: true, align: 'left' },
    ],
    defaultSort: { key: 'name', direction: 'asc' },
    rowsPerPageOptions: [10, 25, 50, 100],
    defaultRowsPerPage: 25,
    emptyMessage: 'No teachers found',
  },

  form: {
    fields: [
      {
        name: 'name',
        label: 'Full Name',
        type: 'text',
        required: true,
        placeholder: 'Enter teacher name',
        validation: requiredText('Name'),
        toPayload: (v: string) => v.trim(),
        row: 1,
      },
      {
        name: 'school',
        label: 'School',
        type: 'text',
        required: true,
        placeholder: 'Enter school name',
        validation: requiredText('School'),
        toPayload: (v: string) => v.trim(),
        row: 1,
      },
      {
        name: 'districtId',
        label: 'District',
        type: 'select',
        required: true,
        helperText: 'Select the district',
        optionsSource: districtOptions,
        validation: requiredSelect('District'),
        toPayload: Number,
        row: 2,
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
        row: 2,
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        required: true,
        optionsSource: {
          kind: 'static',
          options: [
            { label: 'Male', value: 'M' },
            { label: 'Female', value: 'F' },
          ],
        },
        validation: requiredSelect('Gender'),
        row: 3,
      },
      {
        name: 'mobile',
        label: 'Mobile',
        type: 'text',
        placeholder: '10-digit mobile number',
        optional: true,
        validation: (value) => {
          if (value && !/^\d{10}$/.test(value.toString().trim())) {
            return 'Mobile must be 10 digits';
          }
          return true;
        },
        toPayload: (v: string) => (v ? v.trim() : null),
        row: 3,
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        placeholder: 'teacher@example.com',
        optional: true,
        validation: (value) => {
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.toString().trim())) {
            return 'Enter a valid email';
          }
          return true;
        },
        toPayload: (v: string) => (v ? v.trim() : null),
        row: 4,
      },
      {
        name: 'isTipTeacher',
        label: 'TIP Teacher',
        type: 'checkbox',
        toPayload: Boolean,
        row: 5,
      },
      {
        name: 'yearsInTip',
        label: 'Years in TIP',
        type: 'number',
        helperText: 'Only applicable if TIP Teacher is selected',
        optional: true,
        validation: (value) => {
          if (value === undefined || value === null || value === '') return true;
          const num = Number(value);
          if (!Number.isFinite(num) || num < 1) {
            return 'Years in TIP must be a positive number';
          }
          return true;
        },
        toPayload: (v: any) => (v === '' || v === null || v === undefined ? null : Number(v)),
        row: 5,
      },
      {
        name: 'coachId',
        label: 'Referred By Coach',
        type: 'select',
        helperText: 'Select the coach who referred this teacher (optional)',
        optional: true,
        optionsSource: coachOptions,
        toPayload: (v: any) => (v === '' ? null : Number(v)),
        row: 6,
      },
      {
        name: 'tlcGroupId',
        label: 'TLC Group',
        type: 'select',
        helperText: "Teacher's home TLC group (can be left unassigned on initial registration)",
        optional: true,
        optionsSource: tlcGroupOptions,
        toPayload: (v: any) => (v === '' ? null : Number(v)),
        row: 6,
      },
    ],
  },

  api: {
    list: (signal) => apiClient.getTeachers(signal),
    create: (payload) => apiClient.createTeacher(payload as any),
    upload: (file) => apiClient.uploadTeachers(file),
  },

  bulkUpload: {
    enabled: true,
    columnHint: 'Name · School · DistrictId · BlockId · Gender · Mobile · Email · IsTipTeacher · YearsInTip · CoachId',
  },
};