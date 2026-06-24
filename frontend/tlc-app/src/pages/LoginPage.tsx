import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import apiClient from '../services/apiClient';
import type { User } from '../types';
import { NAVY, NAVY_MAIN, AMBER } from '../theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }

    if (!password.trim()) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    setError('');

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.login(email.trim(), password);
      const { token, user } = response.data as { token: string; user: User };
      login(token, user);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          setError('No account found with these credentials. Please check your email and password and try again.');
        } else if (status === 400) {
          setError((err.response?.data as { message?: string })?.message || 'Email and password are required.');
        } else {
          setError('Unable to sign in right now. Please try again later.');
        }
      } else {
        setError('Unable to sign in right now. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
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
            Sign in with your email and password
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              onKeyDown={handleKeyDown}
              error={!!fieldErrors.email}
              helperText={fieldErrors.email}
              fullWidth
              autoFocus
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              onKeyDown={handleKeyDown}
              error={!!fieldErrors.password}
              helperText={fieldErrors.password}
              fullWidth
            />

            <Button
              variant="contained"
              onClick={handleLogin}
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 1, py: 1.25, fontWeight: 700, borderRadius: 2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
