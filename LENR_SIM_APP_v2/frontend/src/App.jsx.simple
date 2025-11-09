import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SimulationDetail from './pages/SimulationDetail';
import NewSimulation from './pages/NewSimulation';
import QuantumTunnelingPage from './pages/QuantumTunnelingPage';
import FusionSimulationPage from './pages/FusionSimulationPage';
import LENRSimulationPage from './pages/LENRSimulationPage';
import BubbleFusionPage from './pages/BubbleFusionPage';
import AppLayout from './components/AppLayout';
import ComponentShowcase from './components/ui/ComponentShowcase';
import './App.css';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <AppLayout>
            <Dashboard />
          </AppLayout>
        } />
        <Route path="/component-showcase" element={
          <AppLayout>
            <ComponentShowcase />
          </AppLayout>
        } />
        <Route path="/dashboard" element={
          <AppLayout>
            <Dashboard />
          </AppLayout>
        } />
        <Route path="/simulation/:simulationId" element={
          <AppLayout>
            <SimulationDetail />
          </AppLayout>
        } />
        <Route path="/new-simulation" element={
          <AppLayout>
            <NewSimulation />
          </AppLayout>
        } />
        <Route path="/quantum-tunneling" element={
          <AppLayout>
            <QuantumTunnelingPage />
          </AppLayout>
        } />
        <Route path="/fusion-simulation" element={
          <AppLayout>
            <FusionSimulationPage />
          </AppLayout>
        } />
        <Route path="/lenr-simulation" element={
          <AppLayout>
            <LENRSimulationPage />
          </AppLayout>
        } />
        <Route path="/bubble-fusion" element={
          <AppLayout>
            <BubbleFusionPage />
          </AppLayout>
        } />
      </Routes>
    </Router>
  );
};

export default App; 