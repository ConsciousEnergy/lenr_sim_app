import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Navbar from './components/Navbar';

const TempApp: React.FC = () => {
  return (
    <Router>
      <Navbar />
      <div>Test App</div>
    </Router>
  );
};

export default TempApp; 