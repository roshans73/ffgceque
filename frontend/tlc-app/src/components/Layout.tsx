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
  CalendarMonth as CalendarIcon,
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

const BRAND_BG  = '#0f2044';
const NAV_BG    = '#1a3a6b';
const ACCENT    = '#f59e0b';
const NAV_HOVER = 'rgba(255,255,255,0.10)';
const BRAND_H   = 64;
const NAV_H     = 44;
const DRAWER_W  = 260;
const DRAWER_CLOSE_MS = 320;

interface LayoutProps { children: React.ReactNode }

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

  return (
    <>
      <Button
        startIcon={icon}
        endIcon={
          <ArrowDownIcon
            sx={{
              fontSize: '1rem !important',
              transition: '0.2s',
              transform: open ? 'rotate(180deg)' : 'none',
            }}
          />
        }
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          color: 'white',
          textTransform: 'none',
          px: 1.75,
          height: NAV_H,
          borderRadius: 0,
          fontSize: '0.85rem',
          fontWeight: active ? 700 : 400,
          gap: 0.5,
          borderBottom: active ? `3px solid ${ACCENT}` : '3px solid transparent',
          borderTop: '3px solid transparent',
          '&:hover': {
            bgcolor: NAV_HOVER,
            borderBottom: `3px solid rgba(255,255,255,0.4)`,
          },
        }}
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
            sx: {
              mt: 0.5,
              borderRadius: 1.5,
              minWidth: 180,
              '& .MuiList-root': { py: 0.5 },
            },
          },
        }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.path}
            onClick={() => { onNavigate(item.path); setAnchor(null); }}
            sx={{
              py: 0.75,
              px: 1.75,
              fontSize: '0.8rem',
              fontWeight: 400,
              letterSpacing: 0.1,
              minHeight: 'unset',
              color: 'text.primary',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [mobileMenus, setMobileMenus]     = useState<Record<string, boolean>>({});
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const go = (path: string) => {
    // Close drawer first, then navigate on next tick.
    // This prevents the drawer's closing animation from shifting
    // focus onto whatever button renders first in the new page
    // (which was causing "Add Coach" to be auto-clicked via focus+Enter).
    setMobileOpen(false);
    setTimeout(() => {
    // Blur whatever is focused now (drawer list item) before navigating
    // so the browser has no "last focused" element to restore focus to.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    navigate(path);
  }, DRAWER_CLOSE_MS);
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
  };

  const isActive = (...prefixes: string[]) =>
    prefixes.some((p) => location.pathname.startsWith(p));

  const toggleMob = (key: string) =>
    setMobileMenus((prev) => ({ ...prev, [key]: !prev[key] }));

  const initial = (user?.name?.charAt(0) ?? 'U').toUpperCase();

  // ── Desktop nav ────────────────────────────────────────────────────────────
  const desktopNav = (
    <Box sx={{ display: 'flex', height: NAV_H }}>
      {[
        {
          label: 'Dashboard',
          path: '/dashboard',
          icon: <DashboardIcon sx={{ fontSize: '1rem !important' }} />,
        },
        {
          label: 'Events',
          path: '/events',
          icon: <CalendarIcon sx={{ fontSize: '1rem !important' }} />,
        },
      ].map(({ label, path, icon }) => (
        <Button
          key={path}
          startIcon={icon}
          onClick={() => go(label === 'Events' ? '/events/calendar' : path)}
          sx={{
            color: 'white',
            textTransform: 'none',
            px: 1.75,
            height: NAV_H,
            borderRadius: 0,
            fontSize: '0.85rem',
            fontWeight: isActive(path) ? 700 : 400,
            borderBottom: isActive(path) ? `3px solid ${ACCENT}` : '3px solid transparent',
            borderTop: '3px solid transparent',
            '&:hover': {
              bgcolor: NAV_HOVER,
              borderBottom: `3px solid rgba(255,255,255,0.4)`,
            },
          }}
        >
          {label}
        </Button>
      ))}

      {hasRole('TechMETeam') && (
        <NavDropdown
          label="Master Data"
          icon={<PeopleIcon sx={{ fontSize: '1rem !important' }} />}
          active={isActive('/masters')}
          onNavigate={go}
          items={[
            { label: 'Districts & Blocks', path: '/masters/districts-blocks' },
            { label: 'Coaches',    path: '/masters/coaches' },
            { label: 'Teachers',   path: '/masters/teachers' },
            { label: 'TLC Groups', path: '/masters/tlcgroups' },
          ]}
        />
      )}

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

      <NavDropdown
        label="Reports"
        icon={<GroupsIcon sx={{ fontSize: '1rem !important' }} />}
        active={isActive('/reports')}
        onNavigate={go}
        items={[
          { label: 'Year-End Summary',            path: '/reports/yearend' },
          { label: 'Longitudinal Analysis',       path: '/reports/longitudinal' },
          { label: 'Teacher Leader Formation',    path: '/reports/teacherleader-formation' },
        ]}
      />

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
            '&:hover': {
              bgcolor: NAV_HOVER,
              borderBottom: `3px solid rgba(255,255,255,0.4)`,
            },
          }}
        >
          Users
        </Button>
      )}
    </Box>
  );

  // ── Mobile drawer ──────────────────────────────────────────────────────────
  const mobileDrawer = (
    <Box sx={{ width: DRAWER_W }} role="presentation">
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: BRAND_BG,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <SchoolIcon sx={{ color: ACCENT }} />
        <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
          TLC Management
        </Typography>
      </Box>
      <Divider />

      <List dense disablePadding sx={{ '& .MuiListItemButton-root': { py: 0.75 } }}>

        <ListItemButton onClick={() => go('/dashboard')}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <DashboardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Dashboard"
            slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }}
          />
        </ListItemButton>

        <ListItemButton onClick={() => go('/events/calendar')}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <CalendarIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Events"
            slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }}
          />
        </ListItemButton>

        {hasRole('TechMETeam') && (
          <>
            <ListItemButton onClick={() => toggleMob('masters')}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <PeopleIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Master Data"
                slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }}
              />
              {mobileMenus['masters'] ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </ListItemButton>
            <Collapse in={!!mobileMenus['masters']} timeout="auto" unmountOnExit>
              <List disablePadding>
                {[
                  { label: 'Coaches',    path: '/masters/coaches'   },
                  { label: 'Teachers',   path: '/masters/teachers'  },
                  { label: 'TLC Groups', path: '/masters/tlcgroups' },
                ].map((item) => (
                  <ListItemButton
                    key={item.path}
                    sx={{ pl: 5.5, py: 0.6 }}
                    onClick={() => go(item.path)}
                  >
                    <ListItemText
                      primary={item.label}
                      slotProps={{ primary: { sx: { fontSize: '0.8rem', color: 'text.secondary' } } }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </>
        )}

        {(hasRole('TLCManager') || hasRole('SustainabilityLead')) && (
          <>
            <ListItemButton onClick={() => toggleMob('attendance')}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <EventNoteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Attendance"
                slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }}
              />
              {mobileMenus['attendance']
                ? <ExpandLess fontSize="small" />
                : <ExpandMore fontSize="small" />}
            </ListItemButton>
            <Collapse in={!!mobileMenus['attendance']} timeout="auto" unmountOnExit>
              <List disablePadding>
                {hasRole('TLCManager') && (
                  <ListItemButton sx={{ pl: 5.5, py: 0.6 }} onClick={() => go('/attendance/tlc')}>
                    <ListItemText
                      primary="TLC Attendance"
                      slotProps={{ primary: { sx: { fontSize: '0.8rem', color: 'text.secondary' } } }}
                    />
                  </ListItemButton>
                )}
                {hasRole('SustainabilityLead') && (
                  <ListItemButton sx={{ pl: 5.5, py: 0.6 }} onClick={() => go('/attendance/masterclass')}>
                    <ListItemText
                      primary="Masterclass Attendance"
                      slotProps={{ primary: { sx: { fontSize: '0.8rem', color: 'text.secondary' } } }}
                    />
                  </ListItemButton>
                )}
              </List>
            </Collapse>
          </>
        )}

        <ListItemButton onClick={() => toggleMob('reports')}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <GroupsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Reports"
            slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }}
          />
          {mobileMenus['reports']
            ? <ExpandLess fontSize="small" />
            : <ExpandMore fontSize="small" />}
        </ListItemButton>
        <Collapse in={!!mobileMenus['reports']} timeout="auto" unmountOnExit>
          <List disablePadding>
            <ListItemButton sx={{ pl: 4 }} onClick={() => go('/reports/yearend')}>
              <ListItemText primary="Year-End Summary" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} onClick={() => go('/reports/longitudinal')}>
              <ListItemText primary="Longitudinal Analysis" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} onClick={() => go('/reports/teacherleader-formation')}>
              <ListItemText primary="Teacher Leader Formation" />
            </ListItemButton>
          </List>
        </Collapse>

        {(hasRole('TechMETeam') || hasRole('SustainabilityLead')) && (
          <ListItemButton onClick={() => go('/users')}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <UsersIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Users"
              slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }}
            />
          </ListItemButton>
        )}
      </List>
    </Box>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        bgcolor: 'background.default',
      }}
    >
      {/* Brand bar */}
      <AppBar
        position="fixed"
        sx={{
          background: `linear-gradient(90deg, ${BRAND_BG} 0%, ${NAV_BG} 100%)`,
          zIndex: (t) => t.zIndex.drawer + 1,
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Toolbar sx={{ minHeight: `${BRAND_H}px !important` }}>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 1 }}
              aria-label="Open navigation menu"
            >
              <MenuIcon />
            </IconButton>
          )}
          <SchoolIcon sx={{ mr: 1, color: ACCENT, fontSize: '1.6rem' }} />
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, letterSpacing: 0.4, fontSize: '1rem' }}
          >
            TLC Management System
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5, mr: 1 }}>
            <Chip
              label={user?.roleName}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.12)',
                color: 'white',
                fontSize: '0.7rem',
                height: 22,
              }}
            />
            <Typography sx={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)' }}>
              {user?.name}
            </Typography>
          </Box>

          <SyncStatus />

          <IconButton onClick={(e) => setProfileAnchor(e.currentTarget)} size="small">
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: ACCENT,
                color: BRAND_BG,
                fontSize: '0.9rem',
                fontWeight: 700,
              }}
            >
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
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {user?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.roleName}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                setProfileAnchor(null);
                logout();
                navigate('/login');
              }}
              sx={{ py: 1.25, fontSize: '0.875rem' }}
            >
              <LogoutIcon sx={{ mr: 1.5, fontSize: '1.1rem' }} /> Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Desktop nav strip */}
      {!isMobile && (
        <AppBar
          position="fixed"
          sx={{
            top: BRAND_H,
            bgcolor: NAV_BG,
            zIndex: 1200,
            boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
          }}
        >
          <Toolbar sx={{ minHeight: `${NAV_H}px !important`, px: 2, py: 0 }}>
            {desktopNav}
          </Toolbar>
        </AppBar>
      )}

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerClose}
        ModalProps={{ keepMounted: false }}
        sx={{
          zIndex: (t) => t.zIndex.appBar - 1,
          '& .MuiDrawer-paper': { width: DRAWER_W, boxSizing: 'border-box' },
        }}
      >
        {mobileDrawer}
      </Drawer>

      {/* Page content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: { xs: `${BRAND_H}px`, md: `${BRAND_H + NAV_H}px` },
          width: '100%',
          minWidth: 0,
          overflowX: 'hidden',
        }}
      >
        <OfflineBanner />
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, width: '100%', maxWidth: '100%', mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};