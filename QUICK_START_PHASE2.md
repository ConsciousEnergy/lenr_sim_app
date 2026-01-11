# Quick Start: Phase 2 Development

## Your Current Achievements ✅
- **Frontend**: React TypeScript app running at http://localhost:3000
- **Backend**: FastAPI server running at http://localhost:8001
- **Features**: Complete physics simulations with 3D visualizations
- **Status**: All compilation errors fixed, memory issues resolved

## Immediate Next Steps (Pick One)

### Option 1: Add Testing (RECOMMENDED)
```bash
# Install testing dependencies
cd LENR_SIM_APP_v2/frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom jest

# Create first test
mkdir src/__tests__
echo "// Test physics hooks" > src/__tests__/physics.test.ts

# Run tests
npm test
```

### Option 2: Add Data Export Feature
```typescript
// Add to frontend/src/components/DataExportPanel.tsx
const exportToCSV = (data: SimulationResults) => {
  // Convert simulation data to CSV
  const csv = convertToCSV(data);
  downloadFile(csv, 'simulation-results.csv');
};
```

### Option 3: Create Simulation Templates
```typescript
// Add to frontend/src/templates/simulationPresets.ts
export const presets = {
  "Quick Test": {
    model: "quantum_tunneling",
    duration: 100,
    temperature: 300
  },
  "LENR Standard": {
    model: "lenr",
    duration: 1000,
    temperature: 500
  }
};
```

## Task Management Commands

### View current tasks
```bash
node scripts/dev.js list
```

### Add a new task
```bash
node scripts/dev.js add-task --title="Add unit tests for physics hooks" --priority=high --description="Create comprehensive tests for all physics API hooks"
```

### Start working on a task
```bash
node scripts/dev.js set-status --id=5 --status=in-progress
```

### Mark task complete
```bash
node scripts/dev.js set-status --id=5 --status=done
```

## Testing Quick Start

### 1. Create a simple test
```typescript
// src/__tests__/api/physics.test.ts
import { renderHook } from '@testing-library/react';
import { useSimulationStatus } from '../../api/physics';

describe('Physics Hooks', () => {
  test('useSimulationStatus returns correct initial state', () => {
    const { result } = renderHook(() => useSimulationStatus(null));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
```

### 2. Run the test
```bash
npm test
```

## Feature Implementation Quick Start

### Add CSV Export
```typescript
// 1. Create export utility
// src/utils/dataExport.ts
export const exportToCSV = (data: any[], filename: string) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};

// 2. Add export button to results panel
// src/components/results/SimulationResults.tsx
<Button onClick={() => exportToCSV(results, 'simulation.csv')}>
  Export CSV
</Button>
```

## Performance Monitoring

### Add performance tracking
```typescript
// src/utils/performance.ts
export const measurePerformance = (name: string, fn: () => void) => {
  performance.mark(`${name}-start`);
  fn();
  performance.mark(`${name}-end`);
  performance.measure(name, `${name}-start`, `${name}-end`);
  
  const measure = performance.getEntriesByName(name)[0];
  console.log(`${name}: ${measure.duration}ms`);
};
```

## Documentation Tasks

### API Documentation
```typescript
/**
 * Initialize a physics simulation
 * @param {SimulationConfig} config - Simulation configuration
 * @returns {Promise<SimulationResponse>} Initialized simulation data
 * @example
 * const sim = await initializeSimulation({
 *   model: 'lenr',
 *   temperature: 500
 * });
 */
```

## CI/CD Quick Setup

### GitHub Actions
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test
      - run: npm run build
```

## Today's Recommended Tasks

1. **Morning (1-2 hours)**
   - Add basic unit tests for 2-3 physics hooks
   - Goal: Establish testing pattern

2. **Afternoon (2-3 hours)**
   - Implement CSV export for simulation results
   - Add download button to UI
   - Test with real simulation data

3. **End of Day (30 min)**
   - Update task status in dev.js
   - Commit changes
   - Plan tomorrow's tasks

## Commands Reference

```bash
# Development
npm start                    # Start frontend
npm run build               # Build for production
npm test                    # Run tests
npm run lint                # Check code quality

# Backend
cd backend
python -m uvicorn main:app --reload  # Normal mode
./start_backend_safe.bat             # Safe mode

# Task Management
node scripts/dev.js list            # View tasks
node scripts/dev.js next           # Get next task
node scripts/dev.js show --id=1    # Task details
```

## Get Started Now!

```bash
# Pick your first Phase 2 task:
node scripts/dev.js add-task --title="Create unit tests for useSimulationStatus hook" --priority=high
node scripts/dev.js set-status --id=5 --status=in-progress

# Start coding!
```

Your app is running perfectly. Time to enhance it! 🚀
