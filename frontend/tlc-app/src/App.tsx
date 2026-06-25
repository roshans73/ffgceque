import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { Layout } from './components/Layout';

// Pages
import { Dashboard } from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import MasterDataPage from './pages/MasterData/MasterDataPage';
import { masterDataPageConfigs } from './data/pageConfig/masterDataPageConfigRegistry';
import TLCAttendancePage from './pages/TLCAttendancePage';
import MasterclassAttendancePage from './pages/MasterclassAttendancePage';
import YearEndReportPage from './pages/YearEndReportPage';
import EventCalendarPage from './pages/EventCalendarPage';
import LongitudinalReportPage from './pages/LongitudinalReportPage';
import UsersPage from './pages/UsersPage';

// Master data routes are derived from the config registry, so adding a new
// master entity is a config change, not a routing/page change.
const MASTER_DATA_ROUTES: Array<{ path: string; configKey: keyof typeof masterDataPageConfigs }> = [
  { path: '/masters/coaches', configKey: 'coaches' },
  { path: '/masters/teachers', configKey: 'teachers' },
  { path: '/masters/tlcgroups', configKey: 'tlcgroups' },
];

const AppContent: React.FC = () => (
  <Routes>
    {/* Public */}
    <Route path="/login" element={<LoginPage />} />

    {/* Dashboard — all authenticated roles */}
    <Route path="/dashboard" element={
      <RoleProtectedRoute><Layout><Dashboard /></Layout></RoleProtectedRoute>
    } />

    {/* Master Data — TechMETeam (bulk upload embedded in each page) */}
    {MASTER_DATA_ROUTES.map(({ path, configKey }) => (
      <Route
        key={path}
        path={path}
        element={
          <RoleProtectedRoute requiredRole="TechMETeam">
            <Layout>
              <MasterDataPage config={masterDataPageConfigs[configKey]} />
            </Layout>
          </RoleProtectedRoute>
        }
      />
    ))}

    {/* User Management — TechMETeam & SustainabilityLead */}
    <Route path="/users" element={
      <RoleProtectedRoute requiredRoles={['TechMETeam', 'SustainabilityLead']}>
        <Layout><UsersPage /></Layout>
      </RoleProtectedRoute>
    } />

    {/* Event Calendar — all authenticated roles */}
    <Route path="/events/calendar" element={
      <RoleProtectedRoute><Layout><EventCalendarPage /></Layout></RoleProtectedRoute>
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
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <SyncProvider>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
              <AppContent />
            </Box>
          </SyncProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;