import { createTheme } from '@mui/material/styles';
import colors from './colors';

/**
 * LENR Simulation App Theme Configuration
 * Based on Material-UI with custom color scheme inspired by conscious.energy
 */

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: colors.primary,
    secondary: colors.secondary,
    background: {
      default: colors.background.default,
      paper: colors.background.paper,
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
      disabled: colors.text.disabled,
    },
    error: colors.semantic.error,
    warning: colors.semantic.warning,
    info: colors.semantic.info,
    success: colors.semantic.success,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '0em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '0.00735em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '0em',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '0.0075em',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.00938em',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
      letterSpacing: '0.00714em',
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
      letterSpacing: '0.01071em',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.75,
      letterSpacing: '0.02857em',
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.66,
      letterSpacing: '0.03333em',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 2.66,
      letterSpacing: '0.08333em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: parseInt(colors.border.radius.medium, 10),
  },
  shadows: [
    'none',
    colors.shadows.small,
    colors.shadows.small,
    colors.shadows.small,
    colors.shadows.small,
    colors.shadows.medium,
    colors.shadows.medium,
    colors.shadows.medium,
    colors.shadows.medium,
    colors.shadows.medium,
    colors.shadows.medium,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.large,
    colors.shadows.elevated,
    colors.shadows.elevated,
    colors.shadows.elevated,
    colors.shadows.elevated,
    colors.shadows.elevated,
    colors.shadows.elevated,
    colors.shadows.elevated,
    colors.shadows.elevated,
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: colors.border.radius.medium,
          textTransform: 'none',
          fontWeight: 500,
          boxShadow: colors.shadows.small,
          '&:hover': {
            boxShadow: colors.shadows.medium,
          },
        },
        containedPrimary: {
          background: colors.gradients.primary,
          '&:hover': {
            background: colors.gradients.primary,
            filter: 'brightness(1.1)',
          },
        },
        containedSecondary: {
          background: colors.gradients.secondary,
          '&:hover': {
            background: colors.gradients.secondary,
            filter: 'brightness(1.1)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: colors.shadows.medium,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: colors.border.radius.medium,
          boxShadow: colors.shadows.medium,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        elevation1: {
          boxShadow: colors.shadows.small,
        },
        elevation2: {
          boxShadow: colors.shadows.medium,
        },
        elevation3: {
          boxShadow: colors.shadows.large,
        },
        elevation4: {
          boxShadow: colors.shadows.elevated,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: colors.border.radius.medium,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

export default theme; 