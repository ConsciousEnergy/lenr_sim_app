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

export default {
  api,
  physics: physicsService,
  reactions: reactionsService
}; 