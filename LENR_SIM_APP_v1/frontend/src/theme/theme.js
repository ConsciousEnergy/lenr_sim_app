import { createTheme } from '@mui/material/styles';
import colors from './colors';

/**
 * LENR Simulation App Theme Configuration
 * Based on Material-UI with custom color scheme inspired by conscious.energy
 */

// Create a theme instance based on mode preference
const createAppTheme = (mode = 'light') => {
  const isDark = mode === 'dark';
  
  // Define mode-specific colors
  const modeSpecificColors = {
    primary: isDark 
      ? colors.primary // Keep purple for dark mode
      : {
          main: '#1976d2', // Original blue for light mode
          light: '#42a5f5',
          dark: '#1565c0',
          contrastText: '#FFFFFF'
        }
  };
  
  // Dark mode specific background colors
  const darkBackgrounds = {
    default: '#0A0A0A', // Darker than before
    paper: '#181818',  // Darker than before
    card: '#202020',   // For cards that need more contrast
    elevated: '#242424' // For elevated components
  };
  
  return createTheme({
    palette: {
      mode: mode,
      ...modeSpecificColors,
      secondary: colors.secondary,
      background: {
        default: isDark ? darkBackgrounds.default : colors.background.default,
        paper: isDark ? darkBackgrounds.paper : colors.background.paper,
      },
      text: {
        primary: isDark ? '#FFFFFF' : colors.text.primary,
        secondary: isDark ? '#CCCCCC' : colors.text.secondary, // Brightened for better contrast
        disabled: isDark ? '#888888' : colors.text.disabled,   // Brightened for better contrast
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
    shadows: isDark ? [
      'none',
      colors.shadows.small.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.small.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.small.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.small.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.medium.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.medium.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.medium.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.medium.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.medium.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.medium.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.large.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.large.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.large.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.large.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.large.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.large.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.elevated.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.elevated.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.elevated.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.elevated.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.elevated.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.elevated.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.elevated.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
      colors.shadows.elevated.replace('rgba(0, 0, 0', 'rgba(0, 0, 0'),
    ] : [
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
            boxShadow: isDark ? 'none' : colors.shadows.small,
            '&:hover': {
              boxShadow: isDark ? 'none' : colors.shadows.medium,
            },
          },
          containedPrimary: {
            background: isDark ? colors.gradients.primary : 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
            '&:hover': {
              background: isDark ? colors.gradients.primary : 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
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
            backgroundColor: isDark ? '#111111' : '#1976d2',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: colors.border.radius.medium,
            boxShadow: isDark ? 'none' : colors.shadows.medium,
            backgroundColor: isDark ? darkBackgrounds.card : colors.background.paper,
            margin: isDark ? theme => theme.spacing(2) : undefined, // Add default margin in dark mode
            padding: isDark ? theme => theme.spacing(2) : undefined, // Add padding in dark mode
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? darkBackgrounds.paper : colors.background.paper,
          },
          elevation1: {
            boxShadow: isDark ? 'none' : colors.shadows.small,
            backgroundColor: isDark ? darkBackgrounds.paper : undefined,
          },
          elevation2: {
            boxShadow: isDark ? 'none' : colors.shadows.medium,
            backgroundColor: isDark ? darkBackgrounds.card : undefined,
          },
          elevation3: {
            boxShadow: isDark ? 'none' : colors.shadows.large,
            backgroundColor: isDark ? darkBackgrounds.card : undefined,
          },
          elevation4: {
            boxShadow: isDark ? 'none' : colors.shadows.elevated,
            backgroundColor: isDark ? darkBackgrounds.elevated : undefined,
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
      MuiSlider: {
        styleOverrides: {
          root: {
            marginTop: isDark ? theme => theme.spacing(3) : undefined, // Add margin for sliders in dark mode
            marginBottom: isDark ? theme => theme.spacing(3) : undefined,
          },
          track: {
            backgroundColor: isDark ? colors.primary.main : undefined,
          },
          thumb: {
            backgroundColor: isDark ? colors.primary.light : undefined,
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? darkBackgrounds.default : colors.background.default,
            color: isDark ? '#FFFFFF' : colors.text.primary,
          }
        }
      }
    },
  });
};

// Default theme
const defaultTheme = createAppTheme('light');

export { createAppTheme };
export default defaultTheme;