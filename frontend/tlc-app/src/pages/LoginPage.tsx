import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import type { User } from '../types';

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
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setError('No account found with these credentials. Please check your email and password and try again.');
      } else if (status === 400) {
        setError(err?.response?.data?.message || 'Email and password are required.');
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
              Sign in with your email and password
            </Typography>
          </Box>

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
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
