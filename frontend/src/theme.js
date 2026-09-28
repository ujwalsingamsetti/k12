import { createTheme } from '@mui/material/styles';

const executiveTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1E40AF',       // Deep Royal Blue
      light: '#3B82F6',      // Bright Accent Blue
      dark: '#1E3A8A',       // Deep Navy
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#6366F1',       // Vibrant Indigo
      light: '#818CF8',
      dark: '#4338CA',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#059669',       // Emerald Green (High marks / Mastery)
      light: '#D1FAE5',
      dark: '#065F46',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#D97706',       // Amber (Revision needed / Misconceptions)
      light: '#FEF3C7',
      dark: '#92400E',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#DC2626',       // Crimson Red (Unaddressed criteria / Errors)
      light: '#FEE2E2',
      dark: '#991B1B',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#0284C7',       // Sky Blue (RAG / Telemetry)
      light: '#E0F2FE',
      dark: '#075985',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8FAFC',    // Executive Slate 50 background
      paper: '#FFFFFF',      // Crisp Pure White surfaces
    },
    text: {
      primary: '#0F172A',    // Slate 900 for high-contrast legibility
      secondary: '#475569',  // Slate 600 for explanatory labels
      disabled: '#94A3B8',   // Slate 400
    },
    divider: '#E2E8F0',      // Slate 200
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      fontWeight: 800,
      letterSpacing: '-0.025em',
      color: '#0F172A',
    },
    h2: {
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#0F172A',
    },
    h3: {
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.015em',
      color: '#0F172A',
    },
    h4: {
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      color: '#0F172A',
    },
    h5: {
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      fontWeight: 600,
      color: '#0F172A',
    },
    h6: {
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      fontWeight: 600,
      color: '#0F172A',
    },
    subtitle1: {
      fontSize: '0.9375rem',
      fontWeight: 500,
      color: '#475569',
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.8125rem',
      fontWeight: 600,
      color: '#64748B',
      letterSpacing: '0.01em',
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: '#334155',
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.55,
      color: '#475569',
    },
    button: {
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 18px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(30, 64, 175, 0.12)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FFFFFF',
          borderColor: '#E2E8F0',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#CBD5E1',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#94A3B8',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#2563EB',
            borderWidth: '2px',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.8125rem',
          minHeight: 44,
          borderRadius: '8px 8px 0 0',
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontWeight: 600,
          fontSize: '0.8125rem',
          '&.Mui-active': {
            color: '#1E40AF',
            fontWeight: 700,
          },
          '&.Mui-completed': {
            color: '#059669',
            fontWeight: 700,
          },
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          '&.Mui-active': {
            color: '#1E40AF',
          },
          '&.Mui-completed': {
            color: '#059669',
          },
        },
      },
    },
  },
});

export default executiveTheme;
