/**
 * LENR Simulation App Color Theme
 * Inspired by conscious.energy color scheme
 */

// Main brand colors
const primary = {
  main: '#6A0DAD', // Deep purple
  light: '#9E56D1',
  dark: '#4B0082',
  contrastText: '#FFFFFF'
};

const secondary = {
  main: '#008080', // Teal
  light: '#20B2AA',
  dark: '#005F5F',
  contrastText: '#FFFFFF'
};

// Accent colors
const accent = {
  purple: {
    light: '#B19CD9',
    main: '#8A2BE2',
    dark: '#4B0082'
  },
  blue: {
    light: '#87CEFA',
    main: '#1E90FF',
    dark: '#0000CD'
  },
  teal: {
    light: '#7FFFD4',
    main: '#008080',
    dark: '#004C4C'
  },
  pink: {
    light: '#FFB6C1',
    main: '#FF69B4',
    dark: '#C71585'
  }
};

// Background colors
const background = {
  default: '#F5F5F7',
  paper: '#FFFFFF',
  dark: '#121212',
  gradient: 'linear-gradient(145deg, #8A2BE2 0%, #1E90FF 50%, #008080 100%)'
};

// Text colors
const text = {
  primary: '#333333',
  secondary: '#666666',
  disabled: '#9E9E9E',
  hint: '#9E9E9E',
  light: '#FFFFFF'
};

// Visualization colors (for charts, graphs, heatmaps)
const visualization = {
  heatmap: [
    '#9E0142', // Start of gradient (hot)
    '#D53E4F',
    '#F46D43',
    '#FDAE61',
    '#FEE08B',
    '#E6F598',
    '#ABDDA4',
    '#66C2A5',
    '#3288BD',
    '#5E4FA2'  // End of gradient (cool)
  ],
  categorical: [
    '#8A2BE2', // Purple
    '#1E90FF', // Blue
    '#20B2AA', // Teal
    '#FF69B4', // Pink
    '#FF8C00', // Orange
    '#008000', // Green
    '#CD5C5C', // Red
    '#800080', // Dark Purple
    '#4682B4', // Steel Blue
    '#2F4F4F'  // Dark Slate Gray
  ]
};

// Semantic colors
const semantic = {
  success: {
    main: '#4CAF50',
    light: '#81C784',
    dark: '#388E3C',
    contrastText: '#FFFFFF'
  },
  warning: {
    main: '#FF9800',
    light: '#FFB74D',
    dark: '#F57C00',
    contrastText: '#000000'
  },
  error: {
    main: '#F44336',
    light: '#E57373',
    dark: '#D32F2F',
    contrastText: '#FFFFFF'
  },
  info: {
    main: '#2196F3',
    light: '#64B5F6',
    dark: '#1976D2',
    contrastText: '#FFFFFF'
  }
};

// Gradients
const gradients = {
  primary: 'linear-gradient(90deg, #6A0DAD 0%, #9E56D1 100%)',
  secondary: 'linear-gradient(90deg, #008080 0%, #20B2AA 100%)',
  accent: 'linear-gradient(90deg, #8A2BE2 0%, #1E90FF 50%, #20B2AA 100%)',
  dark: 'linear-gradient(90deg, #121212 0%, #333333 100%)'
};

// Borders
const border = {
  radius: {
    small: '4px',
    medium: '8px',
    large: '12px',
    round: '50%'
  },
  width: {
    thin: '1px',
    medium: '2px',
    thick: '4px'
  }
};

// Shadows
const shadows = {
  small: '0 2px 4px rgba(0, 0, 0, 0.1)',
  medium: '0 4px 8px rgba(0, 0, 0, 0.12)',
  large: '0 8px 16px rgba(0, 0, 0, 0.14)',
  elevated: '0 12px 24px rgba(0, 0, 0, 0.16)'
};

// Export the color theme
const colorTheme = {
  primary,
  secondary,
  accent,
  background,
  text,
  visualization,
  semantic,
  gradients,
  border,
  shadows
};

export default colorTheme; 