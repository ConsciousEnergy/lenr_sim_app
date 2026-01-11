import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  SettingsBrightness as SystemIcon,
  Palette as ThemeIcon,
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeOptionProps {
  value: 'light' | 'dark' | 'system';
  label: string;
  icon: React.ReactNode;
}

const themeOptions: ThemeOptionProps[] = [
  {
    value: 'light',
    label: 'Light Mode',
    icon: <LightIcon />,
  },
  {
    value: 'dark',
    label: 'Dark Mode',
    icon: <DarkIcon />,
  },
  {
    value: 'system',
    label: 'System Preference',
    icon: <SystemIcon />,
  },
];

const ThemeToggle: React.FC = () => {
  const { theme, isDarkMode, setTheme } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    handleMenuClose();
  };

  // Determine which icon to display based on the current theme
  const getDisplayIcon = () => {
    if (theme === 'system') {
      return isDarkMode ? <DarkIcon /> : <LightIcon />;
    }
    return theme === 'dark' ? <DarkIcon /> : <LightIcon />;
  };

  return (
    <>
      <Tooltip title="Change theme">
        <IconButton onClick={handleMenuOpen} color="inherit" size="large">
          {getDisplayIcon()}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        {themeOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleThemeChange(option.value)}
            selected={theme === option.value}
          >
            <ListItemIcon>{option.icon}</ListItemIcon>
            <ListItemText>{option.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ThemeToggle; 