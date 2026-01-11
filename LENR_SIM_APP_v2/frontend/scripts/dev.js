#!/usr/bin/env node
/**
 * Task Master - Development workflow script
 * This script helps manage tasks for the LENR Simulation Application
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

// Set up the __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up environment
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TASKS_DIR = path.join(PROJECT_ROOT, 'tasks');
const TASKS_FILE = path.join(TASKS_DIR, 'tasks.json');
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// Logger setup
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function log(level, message) {
  if (LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL]) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }
}

// Ensure required directories exist
function ensureDirectoriesExist() {
  if (!fs.existsSync(TASKS_DIR)) {
    fs.mkdirSync(TASKS_DIR, { recursive: true });
    log('info', `Created tasks directory at ${TASKS_DIR}`);
  }
}

// Initialize the tasks.json file if it doesn't exist
function initializeTasksFile() {
  if (!fs.existsSync(TASKS_FILE)) {
    const initialData = {
      tasks: [],
    };
    fs.writeFileSync(TASKS_FILE, JSON.stringify(initialData, null, 2));
    log('info', `Initialized empty tasks file at ${TASKS_FILE}`);
  }
}

// Load the tasks from the tasks.json file
function loadTasks() {
  if (!fs.existsSync(TASKS_FILE)) {
    return { tasks: [] };
  }
  try {
    const data = fs.readFileSync(TASKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    log('error', `Error loading tasks: ${error.message}`);
    return { tasks: [] };
  }
}

// Save the tasks to the tasks.json file
function saveTasks(tasksData) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasksData, null, 2));
    log('info', 'Tasks saved successfully.');
  } catch (error) {
    log('error', `Error saving tasks: ${error.message}`);
  }
}

// Generate individual task files
function generateTaskFiles() {
  const tasksData = loadTasks();
  const taskFiles = [];

  // Remove existing task files
  if (fs.existsSync(TASKS_DIR)) {
    fs.readdirSync(TASKS_DIR).forEach((file) => {
      if (file.startsWith('task-') && file.endsWith('.md')) {
        fs.unlinkSync(path.join(TASKS_DIR, file));
      }
    });
  }

  // Generate new task files
  tasksData.tasks.forEach((task) => {
    const filePath = path.join(TASKS_DIR, `task-${task.id}.md`);
    let content = `# Task ID: ${task.id}
# Title: ${task.title}
# Status: ${task.status}
# Dependencies: ${task.dependencies?.length ? task.dependencies.join(', ') : 'None'}
# Priority: ${task.priority || 'medium'}

# Description:
${task.description || ''}

# Details:
${task.details || ''}

# Test Strategy:
${task.testStrategy || ''}
`;

    // Add subtasks if they exist
    if (task.subtasks?.length) {
      content += `
# Subtasks:
${task.subtasks.map(st => `- [${st.status === 'done' ? 'x' : ' '}] ${st.title}`).join('\n')}

`;
    }

    fs.writeFileSync(filePath, content);
    taskFiles.push(filePath);
  });

  log('info', `Generated ${taskFiles.length} task files in ${TASKS_DIR}`);
  return taskFiles.length;
}

// Parse PRD file to generate tasks manually
function parsePRD(inputFile) {
  if (!fs.existsSync(inputFile)) {
    log('error', `PRD file not found: ${inputFile}`);
    return;
  }

  log('info', `Parsing PRD file: ${inputFile}`);

  try {
    const prdContent = fs.readFileSync(inputFile, 'utf8');
    
    // Extract sections from the PRD
    const sections = [];
    let currentSection = null;
    let currentContent = '';
    
    prdContent.split('\n').forEach(line => {
      if (line.startsWith('## ')) {
        if (currentSection) {
          sections.push({
            title: currentSection,
            content: currentContent.trim()
          });
        }
        currentSection = line.substring(3).trim();
        currentContent = '';
      } else if (line.startsWith('### ') && currentSection) {
        // Subsection - append to current content with clear heading
        currentContent += `\n${line}\n`;
      } else if (currentSection) {
        currentContent += `${line}\n`;
      }
    });
    
    // Add the last section
    if (currentSection) {
      sections.push({
        title: currentSection,
        content: currentContent.trim()
      });
    }
    
    // Generate tasks from sections
    const tasks = [];
    let taskId = 1;
    
    // First, process implementation phases
    const implementationPhases = sections.find(s => s.title.includes('IMPLEMENTATION PHASES'));
    if (implementationPhases) {
      // Extract phase subsections
      const phaseSubsections = [];
      let currentPhase = null;
      let currentPhaseContent = '';
      
      implementationPhases.content.split('\n').forEach(line => {
        if (line.startsWith('### ')) {
          if (currentPhase) {
            phaseSubsections.push({
              title: currentPhase,
              content: currentPhaseContent.trim()
            });
          }
          currentPhase = line.substring(4).trim();
          currentPhaseContent = '';
        } else if (currentPhase) {
          currentPhaseContent += `${line}\n`;
        }
      });
      
      // Add the last phase
      if (currentPhase) {
        phaseSubsections.push({
          title: currentPhase,
          content: currentPhaseContent.trim()
        });
      }
      
      // Create tasks for each phase
      phaseSubsections.forEach(phase => {
        // Extract bullet points from phase content
        const bulletPoints = phase.content
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.trim().substring(2).trim());
          
        // Create a task for the phase
        tasks.push({
          id: taskId++,
          title: phase.title,
          description: `Implement phase: ${phase.title}`,
          details: bulletPoints.join('\n'),
          status: 'pending',
          priority: 'high',
          dependencies: []
        });
        
        // Create subtasks for individual bullet points
        bulletPoints.forEach(point => {
          tasks.push({
            id: taskId++,
            title: point,
            description: `Task from phase: ${phase.title}`,
            details: `Implement: ${point}`,
            status: 'pending',
            priority: 'medium',
            dependencies: [taskId - bulletPoints.length - 1] // Depend on the phase task
          });
        });
      });
    }
    
    // Process must-have features
    const priorities = sections.find(s => s.title.includes('IMPLEMENTATION PRIORITIES'));
    if (priorities) {
      // Extract must-have features
      const mustHaveSubsection = priorities.content.split('\n')
        .find(line => line.startsWith('### ') && line.includes('Must-Have'));
        
      if (mustHaveSubsection) {
        const mustHaveIndex = priorities.content.indexOf(mustHaveSubsection);
        let mustHaveContent = priorities.content.substring(mustHaveIndex);
        
        // Find the end of the subsection (next subsection or end of section)
        const nextSubsectionIndex = mustHaveContent.indexOf('### ', 4);
        if (nextSubsectionIndex > 0) {
          mustHaveContent = mustHaveContent.substring(0, nextSubsectionIndex);
        }
        
        // Extract bullet points
        const bulletPoints = mustHaveContent
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.trim().substring(2).trim());
          
        // Create a task for must-have features
        const mustHaveTaskId = taskId++;
        tasks.push({
          id: mustHaveTaskId,
          title: 'Implement Must-Have Features',
          description: 'Implementation of all critical P0 features',
          details: bulletPoints.join('\n'),
          status: 'pending',
          priority: 'high',
          dependencies: []
        });
        
        // Create subtasks for individual bullet points
        bulletPoints.forEach(point => {
          tasks.push({
            id: taskId++,
            title: `P0: ${point}`,
            description: `Must-have feature: ${point}`,
            details: `Implement the must-have feature: ${point}`,
            status: 'pending',
            priority: 'high',
            dependencies: [mustHaveTaskId]
          });
        });
      }
    }
    
    // Create tasks.json
    const tasksData = { tasks };
    saveTasks(tasksData);
    generateTaskFiles();
    
    log('info', `Generated ${tasks.length} tasks from PRD.`);
  } catch (error) {
    log('error', `Error processing PRD: ${error.message}`);
  }
}

// List tasks with their status
function listTasks() {
  const tasksData = loadTasks();

  if (!tasksData.tasks || tasksData.tasks.length === 0) {
    console.log('\nNo tasks found.');
    return;
  }

  console.log('\n===== TASKS =====');
  tasksData.tasks.forEach(task => {
    const statusIcon = task.status === 'done' ? '✅' : '⏱️';
    console.log(`${statusIcon} [${task.id}] ${task.title} (${task.priority || 'medium'})`);
    
    // Show subtasks if they exist
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach(subtask => {
        const subtaskIcon = subtask.status === 'done' ? '✅' : '⏱️';
        console.log(`  ${subtaskIcon} ${subtask.title}`);
      });
    }
  });
}

// Show details for a specific task
function showTask(taskId) {
  const tasksData = loadTasks();
  const task = tasksData.tasks.find(t => t.id.toString() === taskId.toString());

  if (!task) {
    console.log(`\nTask with ID ${taskId} not found.`);
    return;
  }

  console.log('\n===== TASK DETAILS =====');
  console.log(`ID: ${task.id}`);
  console.log(`Title: ${task.title}`);
  console.log(`Status: ${task.status}`);
  console.log(`Dependencies: ${task.dependencies?.join(', ') || 'None'}`);
  console.log(`Description: ${task.description || ''}`);
  console.log(`Details: ${task.details || ''}`);
  
  console.log(`\nTest Strategy:`);
  console.log(task.testStrategy || '');

  if (task.subtasks && task.subtasks.length > 0) {
    console.log(`\nSubtasks:`);
    task.subtasks.forEach(subtask => {
      console.log(`  [${subtask.status === 'done' ? 'x' : ' '}] ${subtask.title}`);
    });
  }
}

// Find the next task to work on
function findNextTask() {
  const tasksData = loadTasks();
  
  if (!tasksData.tasks || tasksData.tasks.length === 0) {
    console.log('\nNo tasks found.');
    return;
  }

  // Get completed task IDs
  const completedTaskIds = tasksData.tasks
    .filter(task => task.status === 'done')
    .map(task => task.id);

  // Find tasks that are pending and have all dependencies satisfied
  const availableTasks = tasksData.tasks.filter(task => {
    if (task.status !== 'pending') {
      return false;
    }
    
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }
    
    return task.dependencies.every(depId => completedTaskIds.includes(depId));
  });

  if (availableTasks.length === 0) {
    console.log('\nNo available tasks found. All tasks are either completed or have unsatisfied dependencies.');
    return;
  }

  // Sort by priority and then by ID
  const priorityValues = { high: 0, medium: 1, low: 2 };
  const nextTask = availableTasks.sort((a, b) => {
    const priorityA = priorityValues[a.priority || 'medium'];
    const priorityB = priorityValues[b.priority || 'medium'];
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    return a.id - b.id;
  })[0];

  console.log('\n===== NEXT TASK =====');
  console.log(`ID: ${nextTask.id}`);
  console.log(`Title: ${nextTask.title}`);
  console.log(`Priority: ${nextTask.priority || 'medium'}`);
  console.log(`Description:`);
  console.log(nextTask.description || '');
  
  console.log('\nDetails:');
  console.log(nextTask.details || '');
  
  console.log('\nTest Strategy:');
  console.log(nextTask.testStrategy || '');

  if (nextTask.subtasks && nextTask.subtasks.length > 0) {
    console.log('\nSubtasks:');
    nextTask.subtasks.forEach(subtask => {
      console.log(`  [${subtask.status === 'done' ? 'x' : ' '}] ${subtask.title}`);
    });
  }

  console.log('\n\nSuggested Actions:');
  console.log(`  - Start working on this task: node scripts/dev.js show --id=${nextTask.id}`);
  console.log(`  - Mark as completed when done: node scripts/dev.js set-status --id=${nextTask.id} --status=done`);
}

// Update task status
function setTaskStatus(taskId, status) {
  const tasksData = loadTasks();
  
  // Check if it's a subtask (format: parentId.subtaskId)
  if (taskId.includes('.')) {
    const [parentId, subtaskId] = taskId.split('.').map(id => parseInt(id, 10));
    const parentTask = tasksData.tasks.find(t => t.id === parentId);
    
    if (!parentTask || !parentTask.subtasks) {
      log('error', `Parent task ${parentId} or its subtasks not found.`);
      return;
    }
    
    const subtask = parentTask.subtasks.find(st => st.id === subtaskId);
    if (!subtask) {
      log('error', `Subtask ${subtaskId} not found in task ${parentId}.`);
      return;
    }
    
    subtask.status = status;
    log('info', `Updated status of subtask ${subtaskId} in task ${parentId} to ${status}.`);
  } else {
    const task = tasksData.tasks.find(t => t.id.toString() === taskId.toString());
    
    if (!task) {
      log('error', `Task with ID ${taskId} not found.`);
      return;
    }
    
    task.status = status;
    
    // If marking as done, also mark all subtasks as done
    if (status === 'done' && task.subtasks) {
      task.subtasks.forEach(subtask => {
        subtask.status = 'done';
      });
    }
    
    log('info', `Updated status of task ${taskId} to ${status}.`);
  }
  
  saveTasks(tasksData);
  generateTaskFiles();
}

// Expand a task with subtasks
function expandTask(taskId, numSubtasks = 5) {
  const tasksData = loadTasks();
  const task = tasksData.tasks.find(t => t.id.toString() === taskId.toString());
  
  if (!task) {
    log('error', `Task with ID ${taskId} not found.`);
    return;
  }
  
  // Generate subtasks based on task type
  const subtasks = [];
  
  if (task.title.toLowerCase().includes('frontend') || task.title.toLowerCase().includes('ui')) {
    subtasks.push({ id: 1, title: 'Design component structure', status: 'pending' });
    subtasks.push({ id: 2, title: 'Create UI layout', status: 'pending' });
    subtasks.push({ id: 3, title: 'Implement component functionality', status: 'pending' });
    subtasks.push({ id: 4, title: 'Add styling and responsive design', status: 'pending' });
    subtasks.push({ id: 5, title: 'Test component in different scenarios', status: 'pending' });
  } else if (task.title.toLowerCase().includes('backend') || task.title.toLowerCase().includes('api')) {
    subtasks.push({ id: 1, title: 'Define API endpoint structure', status: 'pending' });
    subtasks.push({ id: 2, title: 'Implement data models and validation', status: 'pending' });
    subtasks.push({ id: 3, title: 'Create controller logic', status: 'pending' });
    subtasks.push({ id: 4, title: 'Add error handling and edge cases', status: 'pending' });
    subtasks.push({ id: 5, title: 'Write tests for the API endpoints', status: 'pending' });
  } else if (task.title.toLowerCase().includes('visualization') || task.title.toLowerCase().includes('chart')) {
    subtasks.push({ id: 1, title: 'Select appropriate visualization library', status: 'pending' });
    subtasks.push({ id: 2, title: 'Create data transformation functions', status: 'pending' });
    subtasks.push({ id: 3, title: 'Implement core visualization component', status: 'pending' });
    subtasks.push({ id: 4, title: 'Add interactivity and user controls', status: 'pending' });
    subtasks.push({ id: 5, title: 'Optimize performance for large datasets', status: 'pending' });
  } else {
    subtasks.push({ id: 1, title: 'Analyze requirements', status: 'pending' });
    subtasks.push({ id: 2, title: 'Design solution architecture', status: 'pending' });
    subtasks.push({ id: 3, title: 'Implement core functionality', status: 'pending' });
    subtasks.push({ id: 4, title: 'Test implementation', status: 'pending' });
    subtasks.push({ id: 5, title: 'Document the implementation', status: 'pending' });
  }
  
  // Limit to requested number of subtasks
  const limitedSubtasks = subtasks.slice(0, numSubtasks);
  
  task.subtasks = limitedSubtasks;
  saveTasks(tasksData);
  generateTaskFiles();
  
  log('info', `Added ${limitedSubtasks.length} subtasks to task ${taskId}`);
}

// Clear subtasks from a task
function clearSubtasks(taskId) {
  const tasksData = loadTasks();
  
  if (taskId === 'all') {
    // Clear subtasks from all tasks
    tasksData.tasks.forEach(task => {
      if (task.subtasks) {
        delete task.subtasks;
      }
    });
    
    saveTasks(tasksData);
    generateTaskFiles();
    log('info', 'Cleared subtasks from all tasks.');
    return;
  }
  
  // Handle comma-separated list of task IDs
  if (taskId.includes(',')) {
    const taskIds = taskId.split(',').map(id => id.trim());
    let clearedCount = 0;
    
    taskIds.forEach(id => {
      const task = tasksData.tasks.find(t => t.id.toString() === id);
      if (task && task.subtasks) {
        delete task.subtasks;
        clearedCount++;
      }
    });
    
    saveTasks(tasksData);
    generateTaskFiles();
    log('info', `Cleared subtasks from ${clearedCount} tasks.`);
    return;
  }
  
  // Clear subtasks from a single task
  const task = tasksData.tasks.find(t => t.id.toString() === taskId.toString());
  
  if (!task) {
    log('error', `Task with ID ${taskId} not found.`);
    return;
  }
  
  if (!task.subtasks) {
    log('info', `Task ${taskId} has no subtasks.`);
    return;
  }
  
  delete task.subtasks;
  saveTasks(tasksData);
  generateTaskFiles();
  log('info', `Cleared subtasks from task ${taskId}.`);
}

// Display help message
function showHelp() {
  console.log(`
Usage: Task Master - Development workflow script
  node scripts/dev.js <command> [options]

Commands:
  parse-prd       Parse PRD file to generate tasks
  list            List all tasks
  show            Show task details
  next            Show the next task to work on
  set-status      Update task status
  expand          Expand task with subtasks
  clear-subtasks  Remove subtasks from task
  generate        Generate task files from tasks.json
  help            Show this help message

Options:
  --input=<file>  Input file for parse-prd (default: PRD.txt)
  --id=<id>       Task ID for show, set-status, expand, clear-subtasks
  --status=<status>  New status for set-status
  --subtasks=<num>   Number of subtasks for expand (default: 5)
  --all           Flag for clear-subtasks to clear all tasks

Examples:
  node scripts/dev.js parse-prd --input=PRD.txt
  node scripts/dev.js list
  node scripts/dev.js show --id=1
  node scripts/dev.js set-status --id=1 --status=done
  node scripts/dev.js expand --id=1 --subtasks=5
  node scripts/dev.js clear-subtasks --id=1
  node scripts/dev.js generate
`);
}

// Main function to process command line arguments
async function main() {
  // Ensure required directories exist
  ensureDirectoriesExist();
  initializeTasksFile();

  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  // Process options
  const options = {};
  args.slice(1).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      options[key] = value !== undefined ? value : true;
    }
  });

  switch (command) {
    case 'parse-prd':
      parsePRD(options.input || 'PRD.txt');
      break;
    case 'list':
      listTasks();
      break;
    case 'show':
      showTask(options.id || args[1]);
      break;
    case 'next':
      findNextTask();
      break;
    case 'set-status':
      setTaskStatus(options.id, options.status);
      break;
    case 'expand':
      expandTask(options.id, options.subtasks || 5);
      break;
    case 'clear-subtasks':
      clearSubtasks(options.all ? 'all' : options.id);
      break;
    case 'generate':
      generateTaskFiles();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      showHelp();
  }
}

main()
  .catch(error => {
    log('error', `Unhandled error: ${error.message}`);
    process.exit(1);
  }); 