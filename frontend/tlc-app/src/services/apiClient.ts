import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface ApiError {
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Master Data APIs
  getDistricts = (signal?: AbortSignal) =>
    this.instance.get('/districts', { signal });
  getDistrictById = (id: number) => this.instance.get(`/districts/${id}`);
  createDistrict = (data: unknown) => this.instance.post('/districts', [data]);
  updateDistrict = (id: number, data: unknown) => this.instance.put(`/districts/${id}`, data);
  deleteDistrict = (id: number) => this.instance.delete(`/districts/${id}`);

  getBlocks = (districtId?: number, signal?: AbortSignal) =>
    this.instance.get('/blocks', { params: { districtId }, signal });
  createBlock = (data: unknown) => this.instance.post('/blocks', [data]);

  getCoaches = (districtId?: number, blockId?: number, signal?: AbortSignal) =>
    this.instance.get('/coaches', { params: { districtId, blockId }, signal });
  createCoach = (data: unknown) => this.instance.post('/coaches', [data]);

  getTeachers = (signal?: AbortSignal) =>
    this.instance.get('/teachers', { signal });
  getTeachersByGroup = (groupId: number) =>
    this.instance.get(`/teachers?groupId=${groupId}`);
  createTeacher = (data: unknown) => this.instance.post('/teachers', [data]);

  getTLCGroups = (signal?: AbortSignal) =>
    this.instance.get('/tlcgroups', { signal });
  getTLCGroupById = (id: number) => this.instance.get(`/tlcgroups/${id}`);
  createTLCGroup = (data: unknown) => this.instance.post('/tlcgroups', [data]);

  getTLCMembers = (groupId: number, signal?: AbortSignal) =>
    this.instance.get(`/tlcgroups/${groupId}/members`, { signal });

  // ── Bulk Upload APIs ───────────────────────────────────────────────────────
  uploadCoaches = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return this.instance.post('/upload/coaches', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  uploadTeachers = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return this.instance.post('/upload/teachers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  uploadTLCGroups = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return this.instance.post('/upload/tlcgroups', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  uploadTeacherLeaders = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return this.instance.post('/upload/teacherleaders', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  uploadTLCAndMasterclass = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return this.instance.post('/upload/tlcandmasterclass', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  // Attendance APIs
  recordTLCAttendance = (data: unknown) =>
    this.instance.post('/attendance/tlc', data);

  recordMasterclassAttendance = (data: unknown) =>
    this.instance.post('/attendance/masterclass', data);

  // ── TLC & Masterclass Events ───────────────────────────────────────────────
  getTLCAndMasterclasses = (params?: {
    type?: string;
    status?: string;
    districtId?: number;
    blockId?: number;
    tlcGroupId?: number;
    year?: number;
  }, signal?: AbortSignal) =>
    this.instance.get('/tlcandmasterclass', { params, signal });

  createTLCAndMasterclass = (data: unknown) =>
    this.instance.post('/tlcandmasterclass', [data]);

  updateTLCAndMasterclass = (id: number, data: unknown) =>
    this.instance.put(`/tlcandmasterclass/${id}`, data);

  // Analytics APIs
  getDashboardKpis = (districtId?: number, blockId?: number, startDate?: string, endDate?: string) =>
    this.instance.get('/analytics/dashboard', {
      params: { districtId, blockId, startDate, endDate },
    });

  getYearEndSummary = (districtId?: number, blockId?: number, year?: number, signal?: AbortSignal) =>
    this.instance.get('/analytics/yearend-summary', {
      params: { districtId, blockId, year },
      signal,
    });

  getTLCGroupReport = (tlcGroupId: number, signal?: AbortSignal) =>
    this.instance.get(`/analytics/tlcgroup/${tlcGroupId}`, { signal });

  getLongitudinalAnalysis = (districtId?: number, blockId?: number, signal?: AbortSignal) =>
    this.instance.get('/analytics/longitudinal', {
      params: { districtId, blockId },
      signal,
    });

  getTeacherLeaderFormationReport = (districtId?: number, blockId?: number) =>
    this.instance.get('/analytics/teacherleader-formation', {
      params: { districtId, blockId },
    });

  downloadTeacherLeaderFormationReport = (districtId?: number, blockId?: number) =>
    this.instance.get('/analytics/teacherleader-formation', {
      params: { districtId, blockId, format: 'csv' },
      responseType: 'blob',
    });

  // Auth APIs
  login = (email: string, password: string) =>
    this.instance.post('/auth/login', { email, password });

  // User Management APIs
  getUsers = () => this.instance.get('/users');
  createUser = (data: unknown) => this.instance.post('/users', [data]);
  updateUser = (id: number, data: unknown) => this.instance.put(`/users/${id}`, data);
  activateUser   = (id: number) => this.instance.patch(`/users/${id}/activate`);
  deactivateUser = (id: number) => this.instance.patch(`/users/${id}/deactivate`);
}

export default new ApiClient();