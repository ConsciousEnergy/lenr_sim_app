import { useContext } from 'react';
import { PhysicsContext } from '../contexts/PhysicsContext';

/**
 * Custom hook to access the PhysicsContext
 * @returns {Object} PhysicsContext value
 */
export const usePhysics = () => {
  const context = useContext(PhysicsContext);
  
  if (context === undefined) {
    throw new Error('usePhysics must be used within a PhysicsProvider');
  }
  
  return context;
}; 