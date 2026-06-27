import { createTheme, alpha } from '@mui/material/styles';

/* ─── Brand palette ───────────────────────────────────────────────────────────
   Harmonised with the CeQ Teacher Leadership Circle identity: a deep, trustworthy
   navy paired with a warm amber accent — professional, mission-driven, readable. */
const NAVY        = '#0f2044'; // deep brand navy
const NAVY_MAIN   = '#1a3a6b'; // primary action navy
const NAVY_LIGHT  = '#34528a';
const AMBER       = '#f59e0b'; // warm accent
const AMBER_DARK  = '#d97706';
const AMBER_LIGHT = '#fbbf24';

const INK         = '#1b2433'; // primary text
const INK_SOFT    = '#5b6b82'; // secondary text
const BG          = '#f4f6fb'; // app canvas
const PAPER       = '#ffffff';
const BORDER      = '#e6eaf2';

const HEADING_FONT = '"Plus Jakarta Sans", "Inter", system-ui, sans-serif';
const BODY_FONT    = '"Inter", system-ui, "Segoe UI", Roboto, Arial, sans-serif';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: NAVY_MAIN, dark: NAVY, light: NAVY_LIGHT, contrastText: '#ffffff' },
    secondary: { main: AMBER, dark: AMBER_DARK, light: AMBER_LIGHT, contrastText: '#1b2433' },
    success:   { main: '#15803d', light: '#dcfce7' },
    warning:   { main: '#b45309', light: '#fef3c7' },
    error:     { main: '#dc2626', light: '#fee2e2' },
    info:      { main: NAVY_MAIN, light: '#e0e9f7' },
    background: { default: BG, paper: PAPER },
    text:      { primary: INK, secondary: INK_SOFT },
    divider:   BORDER,
    grey: {
      50:  '#f8fafc',
      100: '#f1f4f9',
      200: '#e6eaf2',
      300: '#d4dbe7',
    },
  },

  shape: { borderRadius: 10 },

  typography: {
    fontFamily: BODY_FONT,
    h1: { fontFamily: HEADING_FONT, fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontFamily: HEADING_FONT, fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontFamily: HEADING_FONT, fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontFamily: HEADING_FONT, fontWeight: 700, letterSpacing: '-0.01em', fontSize: '1.6rem' },
    h5: { fontFamily: HEADING_FONT, fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontFamily: HEADING_FONT, fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
    body2: { lineHeight: 1.6 },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: BG },
      },
    },

    MuiButton: {
  defaultProps: { disableElevation: true },
  styleOverrides: {
    root: {
      borderRadius: 8,
      paddingInline: 18,
      paddingBlock: 8,
      fontWeight: 600,

      '&.MuiButton-containedPrimary': {
        boxShadow: '0 1px 2px rgba(15,32,68,0.18)',
        '&:hover': {
          backgroundColor: NAVY,
          boxShadow: '0 4px 12px rgba(15,32,68,0.22)',
        },
      },

      '&.MuiButton-outlined': {
        borderColor: BORDER,
        '&:hover': {
          borderColor: NAVY_LIGHT,
          backgroundColor: alpha(NAVY_MAIN, 0.04),
        },
      },
    },
  },
},

    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 1px 3px rgba(16,24,40,0.04), 0 1px 2px rgba(16,24,40,0.03)',
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 14 },
        outlined: { borderColor: BORDER },
      },
    },

    MuiTableContainer: {
      styleOverrides: {
        root: { border: `1px solid ${BORDER}` },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#f6f8fc',
            color: INK_SOFT,
            fontWeight: 700,
            fontSize: '0.78rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            borderBottom: `1px solid ${BORDER}`,
          },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: BORDER, fontSize: '0.875rem' },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: alpha(NAVY_MAIN, 0.03) } },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 7, fontWeight: 600 },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: PAPER,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: NAVY_LIGHT },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: { root: { fontWeight: 500 } },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 10px 30px rgba(16,24,40,0.12)',
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16 },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: NAVY, fontSize: '0.75rem', borderRadius: 6, fontWeight: 500 },
        arrow: { color: NAVY },
      },
    },
  },
});

export default theme;
export { NAVY, NAVY_MAIN, NAVY_LIGHT, AMBER, AMBER_DARK, AMBER_LIGHT, BG, BORDER, INK, INK_SOFT };
