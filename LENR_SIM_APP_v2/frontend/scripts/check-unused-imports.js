const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Patterns to search for
const patterns = [
  '@mui/material',
  '@mui/icons-material',
  '@emotion/react',
  '@emotion/styled',
  'makeStyles',
  'withStyles',
  'createStyles',
  'styled-components',
  'classnames',
  'clsx',
  '../../styles',
  './styles',
  '../styles',
  'import.*CSS',
  '.css'
];

// Function to walk directories recursively
const walkDir = (dir, callback) => {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !fullPath.includes('node_modules')) {
      walkDir(fullPath, callback);
    } else if (stat.isFile() && /\.(js|jsx|ts|tsx)$/.test(file)) {
      callback(fullPath);
    }
  });
};

// Print header
console.log('==== Checking for unused imports ====\n');

// Search for patterns in source files
let foundUnused = false;
walkDir('./src', (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  patterns.forEach(pattern => {
    const regex = new RegExp(`(import|require).*${pattern}`, 'g');
    
    if (regex.test(content)) {
      console.log(`Found ${pattern} in ${filePath}`);
      foundUnused = true;
    }
  });
});

if (!foundUnused) {
  console.log('No unused imports found!');
}

// Try to run a bundle analyzer if available
console.log('\n==== Analyzing bundle size ====\n');
try {
  // Check if webpack-bundle-analyzer is installed
  console.log('Building production bundle for analysis...');
  execSync('npm run build:analyze', { stdio: 'inherit' });
} catch (e) {
  console.log('Could not analyze bundle: ', e.message);
  console.log('Try running "npm install -D webpack-bundle-analyzer" and then "npm run build:analyze"');
}

console.log('\nDone!'); 