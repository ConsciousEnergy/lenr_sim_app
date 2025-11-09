# LENR Simulation App - Visualization Debug Guide

## Summary of Fixes Applied

This document summarizes the fixes applied to resolve timeout issues and visualization problems in the LENR Simulation App v2.

## Issues Fixed

### 1. **Backend API Endpoints**
- **Problem**: Frontend was calling `/api/simulations` endpoints that didn't exist in the backend
- **Solution**: Created `mock_simulation_router.py` with complete simulation API endpoints that generate proper mock data

### 2. **Polling Timeout Issues**
- **Problem**: Infinite polling loop causing browser freezes and timeouts
- **Solution**: 
  - Added max polling duration (60 seconds)
  - Implemented retry logic with exponential backoff
  - Added proper error handling for network failures
  - Added request timeouts (5 seconds per request)

### 3. **Visualization Data Structure**
- **Problem**: Mock data structure didn't match what UnifiedLENRVisualizer expected
- **Solution**: 
  - Updated `transformResultsToVisualizationData` to properly format data
  - Enhanced `generateMockVisualizationData` to create realistic FCC lattice structures
  - Ensured proper data structure for latticeData, fusionEvents, and enhancementData

### 4. **Three.js Initialization**
- **Problem**: WebGL context errors and performance issues
- **Solution**: 
  - Added WebGL capability detection
  - Implemented adaptive quality settings based on device performance
  - Added proper cleanup in animation loops
  - Implemented FPS limiting and performance monitoring

## How to Run the Application

### Quick Start
1. Simply run the provided batch file:
   ```bash
   start_app.bat
   ```

### Manual Start

#### Backend (FastAPI)
```bash
cd LENR_SIM_APP_v2/backend
python -m venv venv  # Create virtual environment if not exists
venv\Scripts\activate  # Activate virtual environment
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend (React)
```bash
cd LENR_SIM_APP_v2/frontend
npm install
npm start
```

## Testing the Visualizations

### 1. **Visualization Test Page** (Recommended for Testing)
- Navigate to: http://localhost:3000/visualization-test
- This page allows you to:
  - Load local mock data instantly
  - Load backend mock data (if backend is running)
  - Toggle fusion events and enhancement regions
  - View debug information about the data structure

### 2. **Simulation Dashboard**
- Navigate to: http://localhost:3000/dashboard
- Full simulation workflow:
  1. Adjust parameters (temperature, pressure, material type, etc.)
  2. Click "Start Simulation"
  3. Wait for simulation to complete (mock backend takes ~5 seconds)
  4. View 3D visualization with results

### 3. **Direct API Testing**
- API Documentation: http://localhost:8000/api/docs
- Test endpoints:
  - `POST /api/simulations/` - Create a new simulation
  - `GET /api/simulations/{id}/status` - Check simulation status
  - `POST /api/simulations/test-visualization-data` - Get test visualization data

## Key Files Modified

### Backend
- `backend/app/routers/mock_simulation_router.py` - New mock simulation API router
- `backend/app/main.py` - Added mock simulation router to app

### Frontend
- `frontend/src/components/SimulationDashboard.jsx` - Fixed polling and data transformation
- `frontend/src/components/visualization/UnifiedLENRVisualizer.jsx` - Enhanced error handling and performance
- `frontend/src/pages/VisualizationTest.jsx` - New test page for visualization debugging
- `frontend/src/App.tsx` - Added route for test page

## Data Structure Reference

### Expected Visualization Data Format
```javascript
{
  latticeData: {
    type: "FCC",  // Lattice structure type
    material: "palladium",  // Material type
    temperature: 300,  // Temperature in Kelvin
    loading_ratio: 0.6,  // D/Pd ratio
    points: [  // Array of lattice points
      { x: 0, y: 0, z: 0, type: "host" },
      // ... more points
    ]
  },
  fusionEvents: [  // Array of fusion events
    {
      position: { x: 10, y: 10, z: 10 },
      energy: 5.5,
      time: 30
    },
    // ... more events
  ],
  enhancementData: {
    regions: [  // Enhancement regions
      {
        coordinates: { x: 15, y: 15, z: 15 },
        radius: 3.0,
        enhancement_factor: 2.5,
        type: "phonon_coupling"
      },
      // ... more regions
    ]
  },
  energyData: [/* time series data */],
  temperatureData: [/* time series data */]
}
```

## Troubleshooting

### Common Issues and Solutions

1. **"Failed to connect to simulation server"**
   - Ensure backend is running on port 8000
   - Check CORS settings if frontend and backend are on different ports

2. **WebGL Context Lost**
   - Reduce visualization quality in the quality selector
   - Close other GPU-intensive applications
   - Enable hardware acceleration in browser settings

3. **Visualization Not Showing**
   - Check browser console for errors
   - Verify data structure matches expected format
   - Try loading local mock data first

4. **Performance Issues**
   - Set visualization quality to "Low" or "Medium"
   - Reduce lattice size in mock data generation
   - Disable fusion events or enhancement regions

## Performance Optimization Tips

1. **For Development**:
   - Use the Visualization Test page for quick iterations
   - Start with local mock data before testing with backend
   - Use Chrome DevTools Performance tab to identify bottlenecks

2. **For Production**:
   - Implement data pagination for large datasets
   - Use WebWorkers for heavy calculations
   - Consider using OffscreenCanvas for rendering
   - Implement LOD (Level of Detail) for large lattices

## Next Steps for Production

1. **Replace Mock Backend with Real Physics Engine**:
   - Connect to actual simulation engines
   - Implement real physics calculations
   - Add database persistence for simulation results

2. **Enhance Visualization Features**:
   - Add more visualization types (2D plots, charts)
   - Implement data export functionality
   - Add animation playback controls

3. **Improve Performance**:
   - Implement progressive data loading
   - Add caching for computed visualizations
   - Optimize Three.js scene graph

4. **Add Testing**:
   - Unit tests for data transformation functions
   - Integration tests for API endpoints
   - E2E tests for complete simulation workflow

## Contact and Support

For issues or questions about the visualization system, check:
- Browser console for client-side errors
- Backend logs at `backend/logs/` for server-side issues
- Network tab in DevTools for API communication issues

---
*Last Updated: November 2024*