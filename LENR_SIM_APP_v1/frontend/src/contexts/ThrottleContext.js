import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLogger } from './LogContext';

/**
 * Context for throttling expensive operations in development tools
 * This prevents the application from freezing by controlling the timing and load
 */
const ThrottleContext = createContext({
  throttle: async (fn, priority = 'normal') => fn(),
  registerThrottledTask: () => {},
  unregisterThrottledTask: () => {},
  setPaused: () => {},
  isPaused: false,
  activeTasksCount: 0
});

/**
 * Priority values for throttling (higher values = higher priority)
 */
export const THROTTLE_PRIORITY = {
  CRITICAL: 10,   // User-initiated tasks that must complete quickly
  HIGH: 5,        // Important tasks that should run soon
  NORMAL: 3,      // Standard tasks
  LOW: 1,         // Background tasks that can wait
  IDLE: 0         // Only run when the system is idle
};

/**
 * Provider component for the throttle context
 */
export const ThrottleProvider = ({ children }) => {
  const logger = useLogger();
  const [isPaused, setPaused] = useState(false);
  const [activeTasks, setActiveTasks] = useState({});
  
  // Count active tasks for monitoring
  const activeTasksCount = Object.keys(activeTasks).length;
  
  // Task queue sorted by priority
  const [taskQueue, setTaskQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  /**
   * Register a throttled task for monitoring
   * @param {string} taskId - Unique identifier for the task
   * @param {string} taskName - Descriptive name of the task
   */
  const registerThrottledTask = useCallback((taskId, taskName) => {
    setActiveTasks(prev => ({
      ...prev,
      [taskId]: {
        id: taskId,
        name: taskName,
        startTime: Date.now()
      }
    }));
    
    logger.debug('Registered throttled task', { taskId, taskName });
  }, [logger]);
  
  /**
   * Unregister a throttled task
   * @param {string} taskId - Unique identifier for the task
   */
  const unregisterThrottledTask = useCallback((taskId) => {
    setActiveTasks(prev => {
      const newTasks = { ...prev };
      if (newTasks[taskId]) {
        const duration = Date.now() - newTasks[taskId].startTime;
        logger.debug('Unregistered throttled task', { 
          taskId, 
          name: newTasks[taskId].name,
          duration 
        });
        delete newTasks[taskId];
      }
      return newTasks;
    });
  }, [logger]);
  
  /**
   * Process the task queue
   */
  const processQueue = useCallback(async () => {
    if (isProcessing || taskQueue.length === 0 || isPaused) return;
    
    setIsProcessing(true);
    
    try {
      // Sort tasks by priority (higher first)
      const sortedQueue = [...taskQueue].sort((a, b) => b.priority - a.priority);
      
      // Get the highest priority task
      const nextTask = sortedQueue[0];
      
      // Update the queue
      setTaskQueue(sortedQueue.slice(1));
      
      // Add the task to active tasks
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      registerThrottledTask(taskId, nextTask.name || 'Anonymous Task');
      
      try {
        // Execute the task
        await nextTask.fn();
      } catch (error) {
        logger.error('Error in throttled task', error, { taskId, name: nextTask.name });
      } finally {
        // Remove from active tasks
        unregisterThrottledTask(taskId);
      }
    } finally {
      setIsProcessing(false);
      
      // Schedule next task processing with a small delay
      // This gives the UI thread a chance to update
      if (taskQueue.length > 0 && !isPaused) {
        setTimeout(() => processQueue(), 50);
      }
    }
  }, [isProcessing, taskQueue, isPaused, registerThrottledTask, unregisterThrottledTask, logger]);
  
  // Start processing when queue changes
  useEffect(() => {
    if (taskQueue.length > 0 && !isProcessing && !isPaused) {
      processQueue();
    }
  }, [taskQueue, isProcessing, isPaused, processQueue]);
  
  /**
   * Throttle a function execution
   * @param {Function} fn - Function to throttle
   * @param {string|number} priority - Task priority
   * @param {string} name - Optional task name for logging
   * @returns {Promise} - Promise that resolves when the function completes
   */
  const throttle = useCallback((fn, priority = THROTTLE_PRIORITY.NORMAL, name = '') => {
    return new Promise((resolve, reject) => {
      // Wrap the function to capture its result
      const wrappedFn = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      // Add to queue
      setTaskQueue(prev => [...prev, { fn: wrappedFn, priority, name }]);
    });
  }, []);
  
  // Monitor active tasks and log warnings if tasks are taking too long
  useEffect(() => {
    const taskTimeoutCheck = setInterval(() => {
      const now = Date.now();
      
      Object.values(activeTasks).forEach(task => {
        const duration = now - task.startTime;
        
        if (duration > 10000) { // 10 seconds
          logger.warn('Throttled task is taking too long', { 
            taskId: task.id, 
            name: task.name, 
            duration 
          });
        }
      });
    }, 5000);
    
    return () => clearInterval(taskTimeoutCheck);
  }, [activeTasks, logger]);
  
  const value = {
    throttle,
    registerThrottledTask,
    unregisterThrottledTask,
    setPaused,
    isPaused,
    activeTasksCount
  };
  
  return (
    <ThrottleContext.Provider value={value}>
      {children}
    </ThrottleContext.Provider>
  );
};

/**
 * Hook to use the throttle context
 * @returns {Object} Throttle context
 */
export const useThrottle = () => {
  const context = useContext(ThrottleContext);
  
  if (!context) {
    console.warn('useThrottle must be used within a ThrottleProvider');
    
    // Return a fallback implementation
    return {
      throttle: async (fn) => fn(),
      registerThrottledTask: () => {},
      unregisterThrottledTask: () => {},
      setPaused: () => {},
      isPaused: false,
      activeTasksCount: 0
    };
  }
  
  return context;
};

export default ThrottleContext; 