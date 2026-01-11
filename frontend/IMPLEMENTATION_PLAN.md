# React Frontend Implementation Plan for LENR_SIM_APP

## Overview

This document outlines the implementation plan for the LENR Simulation App's React frontend. The frontend will provide a modern, responsive interface for interacting with the simulation backend, visualizing results, and configuring simulation parameters.

## Technology Stack

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with additional component library (MUI or Chakra UI)
- **State Management**: React Context API + React Query for server state
- **Routing**: React Router
- **Visualization**: 
  - 2D Charts: Recharts
  - 3D Visualization: Three.js

## Project Structure

```
frontend/
├── public/
│   ├── assets/
│   │   └── favicon.ico
├── src/
│   ├── api/
│   │   ├── client.ts             # Base API client setup
│   │   ├── physics.ts            # Physics model API
│   │   ├── simulation.ts         # Simulation control API
│   │   └── reactions.ts          # Custom reactions API
│   ├── components/
│   │   ├── common/               # Shared UI components
│   │   ├── layout/               # Layout components
│   │   ├── simulation/           # Simulation specific components
│   │   ├── visualization/        # Visualization components
│   │   └── settings/             # Application settings components
│   ├── contexts/
│   │   ├── AppSettingsContext.tsx # Global settings context
│   │   ├── SimulationContext.tsx  # Simulation state context
│   │   └── ThemeContext.tsx      # Theme context
│   ├── hooks/
│   │   ├── useSimulation.ts      # Custom hook for simulation control
│   │   ├── useVisualization.ts   # Custom hook for visualization
│   │   └── usePersistence.ts     # Custom hook for data persistence
│   ├── pages/
│   │   ├── Home.tsx              # Landing page
│   │   ├── Dashboard.tsx         # Main simulation dashboard
│   │   ├── Results.tsx           # Detailed results view
│   │   ├── Settings.tsx          # Application settings
│   │   └── NotFound.tsx          # 404 page
│   ├── utils/
│   │   ├── formatting.ts         # Formatting utilities
│   │   ├── validation.ts         # Form validation
│   │   ├── threeCleanup.ts       # Three.js resource management
│   │   └── errorReporting.ts     # Error handling
│   ├── theme/
│   │   ├── index.ts              # Theme configuration
│   │   └── components.ts         # Themed components
│   ├── types/
│   │   ├── simulation.ts         # Simulation related types
│   │   ├── physics.ts            # Physics model types
│   │   └── api.ts                # API response types
│   ├── App.tsx                   # Main app component
│   ├── main.tsx                  # Entry point
│   └── vite-env.d.ts             # Vite type declarations
├── .eslintrc.js                  # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── index.html                    # HTML template
├── package.json                  # Dependencies
├── tailwind.config.js            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── vite.config.ts                # Vite configuration
```

## Implementation Phases

### Phase 1: Initial Setup and Basic Structure

1. **Project Initialization**
   - Create Vite React TypeScript project
   - Configure ESLint, Prettier
   - Set up TailwindCSS
   - Configure basic project structure

2. **Routing Setup**
   - Implement React Router
   - Create base page components with placeholders
   - Implement navigation layout

3. **API Layer**
   - Create base API client with error handling
   - Implement API endpoints for core functionality
   - Add React Query for data fetching and caching

4. **State Management**
   - Implement Context providers for global state
   - Create settings persistence with localStorage
   - Set up basic theme switching

### Phase 2: Core UI Components

1. **Layout Components**
   - Create app shell with responsive sidebar/navigation
   - Implement header with user controls
   - Create content containers

2. **Simulation Controls**
   - Build parameter input forms with validation
   - Create sliders and numeric inputs for parameters
   - Implement simulation control buttons (start/stop/reset)
   - Add parameter presets functionality

3. **Results Display**
   - Create tabbed interface for different result views
   - Implement 2D charts with Recharts
   - Build data tables for numerical results
   - Add export functionality for results data

### Phase 3: Advanced Visualization

1. **Three.js Integration**
   - Set up Three.js scene, camera, and renderer
   - Implement resource management to prevent memory leaks
   - Create camera controls (orbit, pan, zoom)

2. **Visualization Components**
   - Build lattice structure visualization
   - Create animation for fusion processes
   - Implement visualization modes (wireframe, solid, point cloud)
   - Add legends and scale indicators

3. **Interactive Controls**
   - Create visualization control panel
   - Implement color scheme controls
   - Add camera position presets
   - Create animation speed controls

### Phase 4: Custom Reaction Interface

1. **Reaction Builder**
   - Create interface for custom reaction definition
   - Implement validation for physics conservation laws
   - Add visual feedback for valid/invalid configurations

2. **Reaction Management**
   - Build saved reactions list
   - Create import/export functionality
   - Implement reaction comparison tools

### Phase 5: Settings and Preferences

1. **User Preferences**
   - Create settings interface
   - Implement theme selection
   - Add unit selection (SI, imperial)
   - Create visualization defaults

2. **Application Configuration**
   - Add API connection settings
   - Implement logging level controls
   - Create cache management

### Phase 6: Testing and Optimization

1. **Component Testing**
   - Write unit tests for core components
   - Create integration tests for key workflows
   - Implement visual regression testing

2. **Performance Optimization**
   - Optimize rendering performance
   - Implement data virtualization for large datasets
   - Add memory management for 3D visualizations

3. **Cross-browser Testing**
   - Test in major browsers (Chrome, Firefox, Safari, Edge)
   - Fix any browser-specific issues

## Getting Started Steps

```bash
# 1. Create project with Vite
npm create vite@latest frontend -- --template react-ts

# 2. Change to project directory
cd frontend

# 3. Install dependencies
npm install

# 4. Add routing
npm install react-router-dom

# 5. Add styling
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 6. Add data fetching
npm install @tanstack/react-query axios

# 7. Add visualization libraries
npm install three @types/three recharts

# 8. Start development server
npm run dev
```

## Connecting to Backend

The frontend will connect to the FastAPI backend using Axios. Configuration will be stored in environment variables to support different deployment environments:

```typescript
// src/api/client.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log and handle errors
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);
``` 