import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { setupDarkMode } from './utils/darkMode';
import { initializeAntDesignPatches } from './utils/antdPatch';
import { initializeMuiPatches } from './utils/muiPatch';

// Initialize dark mode before rendering
setupDarkMode();

// Initialize Ant Design patches to fix deprecation warnings
initializeAntDesignPatches();

// Initialize Material UI patches to fix deprecation warnings
initializeMuiPatches();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 