/**
 * Tailwind CSS Dark Mode Utilities
 * 
 * This file contains utilities for managing dark mode with Tailwind CSS.
 * In our application, we use the 'class' strategy for dark mode, which means
 * we add a 'dark' class to the <html> element to enable dark mode styles.
 */

// Check if dark mode is enabled
export const isDarkMode = () => {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
};

// Enable dark mode
export const enableDarkMode = () => {
  if (typeof window === 'undefined') return;
  document.documentElement.classList.add('dark');
  localStorage.setItem('darkMode', 'enabled');
};

// Disable dark mode
export const disableDarkMode = () => {
  if (typeof window === 'undefined') return;
  document.documentElement.classList.remove('dark');
  localStorage.setItem('darkMode', 'disabled');
};

// Toggle dark mode
export const toggleDarkMode = () => {
  if (isDarkMode()) {
    disableDarkMode();
  } else {
    enableDarkMode();
  }
  return isDarkMode();
};

// Initialize dark mode based on user's preference
export const initDarkMode = () => {
  if (typeof window === 'undefined') return;
  
  // Check local storage first
  const darkModePreference = localStorage.getItem('darkMode');
  
  if (darkModePreference === 'enabled') {
    enableDarkMode();
    return;
  }
  
  if (darkModePreference === 'disabled') {
    disableDarkMode();
    return;
  }
  
  // If no preference is stored, check system preference
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDarkMode) {
    enableDarkMode();
  } else {
    disableDarkMode();
  }
};

// Listen for system dark mode preference changes
export const setupDarkModeListener = () => {
  if (typeof window === 'undefined') return;
  
  // Only setup listener if user hasn't explicitly set a preference
  if (!localStorage.getItem('darkMode')) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (e.matches) {
        enableDarkMode();
      } else {
        disableDarkMode();
      }
    });
  }
};

// Export a single function to setup dark mode completely
export const setupDarkMode = () => {
  initDarkMode();
  setupDarkModeListener();
}; 