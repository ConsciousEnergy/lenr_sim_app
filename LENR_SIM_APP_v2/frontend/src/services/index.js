/**
 * Services index file
 * 
 * Exports all service modules for easy importing throughout the application
 */

import api from './api';
import physicsService from './physics';
import reactionsService, { 
  validateReaction, 
  formatReactionEquation, 
  createReactionTemplate,
  getElementSymbol,
  REACTION_TEMPLATES
} from './reactions';

export {
  api,
  physicsService,
  reactionsService,
  validateReaction,
  formatReactionEquation,
  createReactionTemplate,
  getElementSymbol,
  REACTION_TEMPLATES
};

const services = {
  api,
  physics: physicsService,
  reactions: reactionsService
};

export default services; 