# Test Plan: SimulationResults Real-Time Updates

## Overview

This document outlines the test plan for verifying that the real-time update functionality in the SimulationResults component works correctly.

## Test Cases

### 1. WebSocket Connection Establishment

**Purpose**: Verify that the component can establish a WebSocket connection

**Steps**:
1. Mount the SimulationResults component with a valid simulationId
2. Observe console logs and network panel
3. Verify that a WebSocket connection is established
4. Check that the UI shows "Real-time" badge

**Expected Results**: 
- WebSocket connection successfully established
- "Real-time" badge appears in the component header
- No errors in console

### 2. WebSocket Data Reception

**Purpose**: Verify that data is properly received and displayed via WebSocket

**Steps**:
1. Start a simulation that sends real-time data
2. Mount the SimulationResults component
3. Observe the charts and data tables

**Expected Results**:
- Charts update in real-time without page refreshes
- Data tables reflect the latest data points
- Statistics update accordingly

### 3. Fallback to Polling

**Purpose**: Verify that the component falls back to polling when WebSockets are unavailable

**Steps**:
1. Disable WebSockets in the browser or block the WebSocket endpoint
2. Mount the SimulationResults component
3. Observe network panel and UI indicators

**Expected Results**:
- Component attempts WebSocket connection, fails
- Component falls back to regular HTTP polling
- UI shows "Polling" as the source
- Data still updates, but via HTTP requests

### 4. Reconnection Handling

**Purpose**: Verify that the component handles WebSocket disconnection and reconnection

**Steps**:
1. Establish a WebSocket connection
2. Simulate network interruption (disconnect network temporarily)
3. Restore network connection
4. Observe behavior

**Expected Results**:
- Component detects disconnection
- Component automatically attempts to reconnect
- Upon successful reconnection, WebSocket updates resume
- During disconnection period, falls back to polling if auto-update is enabled

### 5. Auto-Update Toggle

**Purpose**: Verify that the auto-update toggle works correctly

**Steps**:
1. Mount component with autoUpdate={true}
2. Click the "Auto-updating" button to disable
3. Observe if updates stop
4. Click again to re-enable
5. Observe if updates resume

**Expected Results**:
- When disabled, no automatic updates occur
- When enabled, updates resume (via WebSocket if available, polling if not)
- Button state changes appropriately

### 6. Manual Refresh

**Purpose**: Verify that the manual refresh button works correctly

**Steps**:
1. Disable auto-updates
2. Click the "Refresh" button
3. Observe data changes

**Expected Results**:
- Single data update occurs
- Loading state shows during refresh
- Latest data is displayed after refresh

### 7. Resource Cleanup

**Purpose**: Verify that resources are properly cleaned up when component unmounts

**Steps**:
1. Mount component and establish connection
2. Unmount component (navigate away or remove from DOM)
3. Monitor network and console

**Expected Results**:
- WebSocket connection is closed or unsubscribed
- No memory leaks (can be verified with browser dev tools)
- No errors in console after unmount

### 8. Performance Under Load

**Purpose**: Verify component performance with frequent updates

**Steps**:
1. Configure simulation to send updates very frequently (e.g., every 100ms)
2. Monitor UI responsiveness and memory usage

**Expected Results**:
- UI remains responsive
- Memory usage remains stable
- Charts update smoothly
- Maximum of 100 data points maintained

## Edge Cases

### 1. Empty Data Handling

**Purpose**: Verify correct handling of empty data responses

**Steps**:
1. Configure simulation to return empty data sets
2. Observe component behavior

**Expected Results**:
- Component shows appropriate empty state
- No errors or crashes

### 2. Malformed Data Handling

**Purpose**: Verify resilience against malformed data

**Steps**:
1. Configure mock data to be malformed or missing expected fields
2. Observe error handling

**Expected Results**:
- Errors are caught and logged
- UI shows appropriate error messages
- Component continues functioning

### 3. Large Data Set Handling

**Purpose**: Verify performance with large data sets

**Steps**:
1. Configure simulation to return very large data sets
2. Observe rendering performance

**Expected Results**:
- Component limits data points to maintain performance
- Charts and tables render correctly
- No significant UI lag 