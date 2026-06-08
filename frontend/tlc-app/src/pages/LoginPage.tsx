import React, { useState } from 'react';
import {
  Box,
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
import { School as SchoolIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import { ROLES, getRoleByName } from '../constants/roles';
import { NAVY, NAVY_MAIN, AMBER } from '../theme';

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
        flexDirection: { xs: 'column', md: 'row' },
        minHeight: '100vh',
        width: '100%',
      }}
    >
      {/* ── Brand panel (left on desktop, top on mobile) ── */}
      <Box
        sx={{
          flex: { xs: 'none', md: 1 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: { xs: 'center', md: 'flex-start' },
          textAlign: { xs: 'center', md: 'left' },
          color: '#fff',
          px: { xs: 3, sm: 6, md: 8 },
          py: { xs: 5, md: 6 },
          background: `radial-gradient(1200px 600px at 0% 0%, ${NAVY_MAIN} 0%, ${NAVY} 60%)`,
        }}
      >
        <Box sx={{ width: 64, height: 64, borderRadius: '50%', mb: 2.5,
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   bgcolor: 'rgba(255,255,255,0.12)' }}>
          <SchoolIcon sx={{ color: AMBER, fontSize: '2.2rem' }} />
        </Box>
        <Typography sx={{ fontWeight: 800, letterSpacing: '-0.02em',
                          fontSize: { xs: '1.6rem', md: '2.4rem' }, lineHeight: 1.1 }}>
          TLC Management System
        </Typography>
        <Typography sx={{ mt: 1.5, maxWidth: 440, color: 'rgba(255,255,255,0.8)',
                          fontSize: { xs: '0.95rem', md: '1.05rem' } }}>
          Teacher Leadership Circle · CeQ — plan events, track attendance, and
          monitor programme impact, all in one place.
        </Typography>
      </Box>

      {/* ── Form panel (right on desktop, bottom on mobile) ── */}
      <Box
        sx={{
          flex: { xs: 1, md: 1 },
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'background.paper',
          px: { xs: 3, sm: 6 },
          py: { xs: 5, md: 6 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Sign in</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, mt: 0.5 }}>
            Development login — select a role to continue
          </Typography>

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
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
