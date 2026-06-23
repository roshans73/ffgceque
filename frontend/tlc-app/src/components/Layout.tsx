import React, { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  EventNote as EventNoteIcon,
  ExpandLess,
  ExpandMore,
  Groups as GroupsIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Logout as LogoutIcon,
  ManageAccounts as UsersIcon,
  Menu as MenuIcon,
  People as PeopleIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OfflineBanner from './OfflineBanner';
import SyncStatus from './SyncStatus';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BRAND_BG   = '#0f2044';   // deep navy
const NAV_BG     = '#1a3a6b';   // lighter navy for nav strip
const ACCENT     = '#f59e0b';   // amber – active indicator
const NAV_HOVER  = 'rgba(255,255,255,0.10)';
const BRAND_H    = 64;          // px – brand AppBar height
const NAV_H      = 44;          // px – nav strip height
const DRAWER_W   = 280;         // px – mobile drawer width

interface LayoutProps { children: React.ReactNode }

// ─── Reusable desktop dropdown ────────────────────────────────────────────────
interface DropdownProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  items: { label: string; path: string }[];
  onNavigate: (path: string) => void;
}

const NavDropdown: React.FC<DropdownProps> = ({ label, icon, active, items, onNavigate }) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  const btnSx = {
    color: 'white',
    textTransform: 'none' as const,
    px: 1.75,
    height: `${NAV_H}px`,
    borderRadius: 0,
    fontSize: '0.85rem',
    fontWeight: active ? 700 : 400,
    gap: 0.5,
    borderBottom: active ? `3px solid ${ACCENT}` : '3px solid transparent',
    borderTop: '3px solid transparent',
    '&:hover': { bgcolor: NAV_HOVER, borderBottom: `3px solid rgba(255,255,255,0.4)` },
  };

  return (
    <>
      <Button
        startIcon={icon}
        endIcon={
          <ArrowDownIcon
            sx={{ fontSize: '1rem !important', transition: '0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        }
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={btnSx}
      >
        {label}
      </Button>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        slotProps={{
          paper: {
            elevation: 4,
            sx: { mt: 0.5, borderRadius: 2, minWidth: 210 },
          },
        }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.path}
            onClick={() => { onNavigate(item.path); setAnchor(null); }}
            sx={{ py: 1.25, fontSize: '0.875rem' }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

// ─── Layout ───────────────────────────────────────────────────────────────────
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [mobileMenus, setMobileMenus] = useState<Record<string, boolean>>({});
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);

  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout, hasRole } = useAuth();
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('md'));

  const go = (path: string) => { navigate(path); setMobileOpen(false); };
  const isActive = (...prefixes: string[]) => prefixes.some((p) => location.pathname.startsWith(p));
  const toggleMob = (key: string) =>
    setMobileMenus((prev) => ({ ...prev, [key]: !prev[key] }));

  const initial = (user?.name?.charAt(0) ?? 'U').toUpperCase();

  // ── Desktop nav strip ──────────────────────────────────────────────────────
  const desktopNav = (
    <Box sx={{ display: 'flex', height: NAV_H }}>

      {/* Dashboard */}
      <Button
        startIcon={<DashboardIcon sx={{ fontSize: '1rem !important' }} />}
        onClick={() => go('/dashboard')}
        sx={{
          color: 'white',
          textTransform: 'none',
          px: 1.75,
          height: NAV_H,
          borderRadius: 0,
          fontSize: '0.85rem',
          fontWeight: location.pathname === '/dashboard' ? 700 : 400,
          borderBottom: location.pathname === '/dashboard' ? `3px solid ${ACCENT}` : '3px solid transparent',
          borderTop: '3px solid transparent',
          '&:hover': { bgcolor: NAV_HOVER, borderBottom: `3px solid rgba(255,255,255,0.4)` },
        }}
      >
        Dashboard
      </Button>

      {/* Master Data */}
      {hasRole('TechMETeam') && (
        <NavDropdown
          label="Master Data"
          icon={<PeopleIcon sx={{ fontSize: '1rem !important' }} />}
          active={isActive('/masters')}
          onNavigate={go}
          items={[
            { label: 'Coaches',    path: '/masters/coaches' },
            { label: 'Teachers',   path: '/masters/teachers' },
            { label: 'TLC Groups', path: '/masters/tlcgroups' },
          ]}
        />
      )}


      {/* Attendance — TLCManager (TLC) and SustainabilityLead (Masterclass) only */}
      {(hasRole('TLCManager') || hasRole('SustainabilityLead')) && (
        <NavDropdown
          label="Attendance"
          icon={<EventNoteIcon sx={{ fontSize: '1rem !important' }} />}
          active={isActive('/attendance')}
          onNavigate={go}
          items={[
            ...(hasRole('TLCManager')
              ? [{ label: 'TLC Attendance',        path: '/attendance/tlc'         }] : []),
            ...(hasRole('SustainabilityLead')
              ? [{ label: 'Masterclass Attendance', path: '/attendance/masterclass' }] : []),
          ]}
        />
      )}

      {/* Reports */}
      <NavDropdown
        label="Reports"
        icon={<GroupsIcon sx={{ fontSize: '1rem !important' }} />}
        active={isActive('/reports')}
        onNavigate={go}
        items={[
          { label: 'Year-End Summary',      path: '/reports/yearend' },
          { label: 'Longitudinal Analysis', path: '/reports/longitudinal' },
        ]}
      />

      {/* Users — TechMETeam & SustainabilityLead */}
      {(hasRole('TechMETeam') || hasRole('SustainabilityLead')) && (
        <Button
          startIcon={<UsersIcon sx={{ fontSize: '1rem !important' }} />}
          onClick={() => go('/users')}
          sx={{
            color: 'white',
            textTransform: 'none',
            px: 1.75,
            height: NAV_H,
            borderRadius: 0,
            fontSize: '0.85rem',
            fontWeight: isActive('/users') ? 700 : 400,
            borderBottom: isActive('/users') ? `3px solid ${ACCENT}` : '3px solid transparent',
            borderTop: '3px solid transparent',
            '&:hover': { bgcolor: NAV_HOVER, borderBottom: `3px solid rgba(255,255,255,0.4)` },
          }}
        >
          Users
        </Button>
      )}
    </Box>
  );

  // ── Mobile drawer ──────────────────────────────────────────────────────────
  const mobileDrawer = (
    <Box sx={{ width: DRAWER_W }}>
      <Box sx={{ px: 2, py: 1.5, bgcolor: BRAND_BG, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SchoolIcon sx={{ color: ACCENT }} />
        <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>
          TLC Management
        </Typography>
      </Box>
      <Divider />

      <List dense disablePadding>
        <ListItemButton onClick={() => go('/dashboard')}>
          <ListItemIcon><DashboardIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>

        {hasRole('TechMETeam') && (
          <>
            <ListItemButton onClick={() => toggleMob('masters')}>
              <ListItemIcon><PeopleIcon /></ListItemIcon>
              <ListItemText primary="Master Data" />
              {mobileMenus['masters'] ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={!!mobileMenus['masters']} timeout="auto">
              <List disablePadding>
                <ListItemButton sx={{ pl: 4 }} onClick={() => go('/masters/coaches')}>
                  <ListItemText primary="Coaches" />
                </ListItemButton>
                <ListItemButton sx={{ pl: 4 }} onClick={() => go('/masters/teachers')}>
                  <ListItemText primary="Teachers" />
                </ListItemButton>
                <ListItemButton sx={{ pl: 4 }} onClick={() => go('/masters/tlcgroups')}>
                  <ListItemText primary="TLC Groups" />
                </ListItemButton>
              </List>
            </Collapse>

          </>
        )}

        {(hasRole('TLCManager') || hasRole('SustainabilityLead')) && (
          <>
            <ListItemButton onClick={() => toggleMob('attendance')}>
              <ListItemIcon><EventNoteIcon /></ListItemIcon>
              <ListItemText primary="Attendance" />
              {mobileMenus['attendance'] ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={!!mobileMenus['attendance']} timeout="auto">
              <List disablePadding>
                {hasRole('TLCManager') && (
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/attendance/tlc')}>
                    <ListItemText primary="TLC Attendance" />
                  </ListItemButton>
                )}
                {hasRole('SustainabilityLead') && (
                  <ListItemButton sx={{ pl: 4 }} onClick={() => go('/attendance/masterclass')}>
                    <ListItemText primary="Masterclass Attendance" />
                  </ListItemButton>
                )}
              </List>
            </Collapse>
          </>
        )}

        <ListItemButton onClick={() => toggleMob('reports')}>
          <ListItemIcon><GroupsIcon /></ListItemIcon>
          <ListItemText primary="Reports" />
          {mobileMenus['reports'] ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={!!mobileMenus['reports']} timeout="auto">
          <List disablePadding>
            <ListItemButton sx={{ pl: 4 }} onClick={() => go('/reports/yearend')}>
              <ListItemText primary="Year-End Summary" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} onClick={() => go('/reports/longitudinal')}>
              <ListItemText primary="Longitudinal Analysis" />
            </ListItemButton>
          </List>
        </Collapse>

        {/* Users — TechMETeam & SustainabilityLead */}
        {(hasRole('TechMETeam') || hasRole('SustainabilityLead')) && (
          <ListItemButton onClick={() => go('/users')}>
            <ListItemIcon><UsersIcon /></ListItemIcon>
            <ListItemText primary="Users" />
          </ListItemButton>
        )}
      </List>
    </Box>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f5f6fa' }}>

      {/* ── Brand bar ── */}
      <AppBar
        position="fixed"
        sx={{ bgcolor: BRAND_BG, zIndex: 1300, boxShadow: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Toolbar sx={{ minHeight: `${BRAND_H}px !important` }}>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <SchoolIcon sx={{ mr: 1, color: ACCENT, fontSize: '1.6rem' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.4, fontSize: '1rem' }}>
            TLC Management System
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {/* Role chip + name */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5, mr: 1 }}>
            <Chip
              label={user?.roleName}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'white',
                    fontSize: '0.7rem', height: 22 }}
            />
            <Typography sx={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)' }}>
              {user?.name}
            </Typography>
          </Box>

          <SyncStatus />

          {/* Avatar / profile menu trigger */}
          <IconButton onClick={(e) => setProfileAnchor(e.currentTarget)} size="small">
            <Avatar sx={{ width: 34, height: 34, bgcolor: '#3b82f6', fontSize: '0.9rem', fontWeight: 700 }}>
              {initial}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={() => setProfileAnchor(null)}
            slotProps={{ paper: { sx: { mt: 1, minWidth: 190, borderRadius: 2 } } }}
          >
            <Box sx={{ px: 2, py: 1.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{user?.name}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.roleName}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setProfileAnchor(null); logout(); navigate('/login'); }}
              sx={{ py: 1.25, fontSize: '0.875rem' }}>
              <LogoutIcon sx={{ mr: 1.5, fontSize: '1.1rem' }} /> Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* ── Nav strip (desktop only) ── */}
      {!isMobile && (
        <AppBar
          position="fixed"
          sx={{ top: BRAND_H, bgcolor: NAV_BG, zIndex: 1200,
                boxShadow: '0 3px 10px rgba(0,0,0,0.25)' }}
        >
          <Toolbar sx={{ minHeight: `${NAV_H}px !important`, px: 2, py: 0 }}>
            {desktopNav}
          </Toolbar>
        </AppBar>
      )}

      {/* ── Mobile drawer ── */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': { width: DRAWER_W, boxSizing: 'border-box' } }}
      >
        {mobileDrawer}
      </Drawer>

      {/* ── Page content ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: { xs: `${BRAND_H}px`, md: `${BRAND_H + NAV_H}px` },
          minWidth: 0,
        }}
      >
        <OfflineBanner />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};
