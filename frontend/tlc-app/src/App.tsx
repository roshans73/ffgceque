import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { Layout } from './components/Layout';

// Pages
import { Dashboard } from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import CoachesPage from './pages/CoachesPage';
import TeachersPage from './pages/TeachersPage';
import TLCGroupsPage from './pages/TLCGroupsPage';
import TLCAttendancePage from './pages/TLCAttendancePage';
import MasterclassAttendancePage from './pages/MasterclassAttendancePage';
import YearEndReportPage from './pages/YearEndReportPage';
import LongitudinalReportPage from './pages/LongitudinalReportPage';
import UsersPage from './pages/UsersPage';

const theme = createTheme({
  palette: {
    primary:   { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
  },
});

const AppContent: React.FC = () => (
  <Routes>
    {/* Public */}
    <Route path="/login" element={<LoginPage />} />

    {/* Dashboard — all authenticated roles */}
    <Route path="/dashboard" element={
      <RoleProtectedRoute><Layout><Dashboard /></Layout></RoleProtectedRoute>
    } />

    {/* Master Data — TechMETeam (bulk upload embedded in each page) */}
    <Route path="/masters/coaches" element={
      <RoleProtectedRoute requiredRole="TechMETeam"><Layout><CoachesPage /></Layout></RoleProtectedRoute>
    } />
    <Route path="/masters/teachers" element={
      <RoleProtectedRoute requiredRole="TechMETeam"><Layout><TeachersPage /></Layout></RoleProtectedRoute>
    } />
    <Route path="/masters/tlcgroups" element={
      <RoleProtectedRoute requiredRole="TechMETeam"><Layout><TLCGroupsPage /></Layout></RoleProtectedRoute>
    } />

    {/* User Management — TechMETeam & SustainabilityLead */}
    <Route path="/users" element={
      <RoleProtectedRoute requiredRoles={['TechMETeam', 'SustainabilityLead']}>
        <Layout><UsersPage /></Layout>
      </RoleProtectedRoute>
    } />

    {/* Attendance */}
    <Route path="/attendance/tlc" element={
      <RoleProtectedRoute requiredRole="TLCManager"><Layout><TLCAttendancePage /></Layout></RoleProtectedRoute>
    } />
    <Route path="/attendance/masterclass" element={
      <RoleProtectedRoute requiredRole="SustainabilityLead"><Layout><MasterclassAttendancePage /></Layout></RoleProtectedRoute>
    } />

    {/* Reports — all authenticated roles */}
    <Route path="/reports/yearend" element={
      <RoleProtectedRoute><Layout><YearEndReportPage /></Layout></RoleProtectedRoute>
    } />
    <Route path="/reports/longitudinal" element={
      <RoleProtectedRoute><Layout><LongitudinalReportPage /></Layout></RoleProtectedRoute>
    } />

    {/* Fallback */}
    <Route path="/"  element={<Navigate to="/dashboard" replace />} />
    <Route path="*"  element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <SyncProvider>
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
              <AppContent />
            </Box>
          </SyncProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
