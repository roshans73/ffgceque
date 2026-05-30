import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import { ROLES, getRoleByName } from '../constants/roles';

const LoginPage: React.FC = () => {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [roleName, setRoleName] = useState('TechMETeam');
  const [error, setError]       = useState('');
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleLogin = () => {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }
    const role = getRoleByName(roleName)!;
    const mockUser: User = {
      id: 1,
      email,
      name,
      roleId:   role.id,
      roleName: role.name,
      isActive: true,
    };
    login('dev-mock-token', mockUser);
    navigate('/dashboard');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: '#f5f6fa',
      }}
    >
      <Card sx={{ width: 420, p: 2, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              TLC Management System
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Development login — select a role to continue
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="Full Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={roleName}
                label="Role"
                onChange={(e: SelectChangeEvent) => setRoleName(e.target.value)}
              >
                {ROLES.map((r) => (
                  <MenuItem key={r.id} value={r.name}>
                    {r.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={handleLogin}
              fullWidth
              size="large"
              sx={{ mt: 1, py: 1.25, fontWeight: 700, borderRadius: 2 }}
            >
              Sign In
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
