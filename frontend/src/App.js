
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import ThreeJsDebug from './debug/ThreeJsDebug';
import VisualizationTester from './debug/VisualizationTester';
import SettingsPage from './debug/SettingsPage';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>LENR Simulation App</h1>
          <nav style={{ marginBottom: '20px' }}>
            <Link to="/" style={{ margin: '0 10px' }}>Home</Link>
            <Link to="/three-debug" style={{ margin: '0 10px' }}>ThreeJS Debug</Link>
            <Link to="/visualization" style={{ margin: '0 10px' }}>Visualization Tester</Link>
            <Link to="/settings" style={{ margin: '0 10px' }}>Settings</Link>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/three-debug" element={<ThreeJsDebug />} />
            <Route path="/visualization" element={<VisualizationTester />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function Home() {
  return (
    <div>
      <h2>Welcome to the LENR Simulation App</h2>
      <p>This application provides visualization tools for Low Energy Nuclear Reaction simulations.</p>
      <p>Click the links above to explore the different components:</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li style={{ margin: '10px 0' }}>
          <strong>ThreeJS Debug</strong> - A simple Three.js demonstration with a rotating cube
        </li>
        <li style={{ margin: '10px 0' }}>
          <strong>Visualization Tester</strong> - Test environment for various visualization components
        </li>
        <li style={{ margin: '10px 0' }}>
          <strong>Settings</strong> - Configuration options for the application
        </li>
      </ul>
    </div>
  );
}

export default App; 