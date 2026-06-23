import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  /** Single role — user must have exactly this role */
  requiredRole?: string;
  /** Multiple roles — user must have at least one */
  requiredRoles?: string[];
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredRoles,
}) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Collect all required roles into one list and check any-match
  const roles = [
    ...(requiredRole  ? [requiredRole]  : []),
    ...(requiredRoles ?? []),
  ];

  if (roles.length > 0 && !roles.some((r) => hasRole(r))) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6" color="error">Access Denied</Typography>
        <Typography variant="body2" color="text.secondary">
          You do not have permission to access this page.
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
};
