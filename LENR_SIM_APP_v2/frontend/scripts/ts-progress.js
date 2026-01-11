/**
 * TypeScript Implementation Progress Tracker
 * This script checks the codebase for TypeScript conversion progress
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);

// Directories to check
const directories = [
  'src/components/visualization',
  'src/pages',
  'src/contexts',
];

// File types to analyze
const fileTypes = {
  typescript: ['.ts', '.tsx'],
  javascript: ['.js', '.jsx'],
};

// Components for which we care about TS conversion
const targetComponents = [
  'UnifiedLENRVisualizer',
  'LatticeStructure',
  'PhysicsVisualizationContainer',
];

async function* getFiles(dir) {
  const dirEntries = await readdir(dir, { withFileTypes: true });
  for (const entry of dirEntries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* getFiles(fullPath);
    } else {
      yield fullPath;
    }
  }
}

async function countFiles() {
  const counts = {
    typescript: 0,
    javascript: 0,
    total: 0,
    interfaceFiles: 0,
    typesInFiles: 0,
    componentsByType: {}
  };

  const componentStatus = {};

  for (const dir of directories) {
    const dirPath = path.join(process.cwd(), dir);
    
    try {
      await stat(dirPath);
    } catch (err) {
      console.warn(`Directory ${dirPath} does not exist, skipping...`);
      continue;
    }
    
    for await (const file of getFiles(dirPath)) {
      const ext = path.extname(file);
      const fileName = path.basename(file);
      const baseName = path.basename(file, ext);
      
      counts.total++;
      
      // Check file type
      if (fileTypes.typescript.includes(ext)) {
        counts.typescript++;
        
        // Check if it's an interface file
        if (fileName.includes('interface') || fileName.includes('type')) {
          counts.interfaceFiles++;
        }
        
        // Check for component status
        for (const component of targetComponents) {
          if (baseName.includes(component)) {
            componentStatus[component] = 'TypeScript';
          }
        }
        
        // Count type usage
        try {
          const content = await readFile(file, 'utf8');
          const typeMatches = content.match(/: [A-Z][A-Za-z0-9_]*(\[\])?/g) || [];
          const interfaceMatches = content.match(/interface [A-Z][A-Za-z0-9_]*/g) || [];
          const typedefMatches = content.match(/type [A-Z][A-Za-z0-9_]*/g) || [];
          
          counts.typesInFiles += typeMatches.length + interfaceMatches.length + typedefMatches.length;
        } catch (err) {
          console.error(`Error reading file ${file}:`, err);
        }
      } else if (fileTypes.javascript.includes(ext)) {
        counts.javascript++;
        
        // Check for component status
        for (const component of targetComponents) {
          if (baseName.includes(component) && !componentStatus[component]) {
            componentStatus[component] = 'JavaScript';
          }
        }
      }
    }
  }
  
  // Calculate stats for components
  for (const component of targetComponents) {
    const status = componentStatus[component] || 'Not Found';
    if (!counts.componentsByType[status]) {
      counts.componentsByType[status] = 0;
    }
    counts.componentsByType[status]++;
  }
  
  return { counts, componentStatus };
}

async function generateReport() {
  console.log('Analyzing TypeScript implementation progress...');
  console.log('---------------------------------------------');
  
  const { counts, componentStatus } = await countFiles();
  
  const totalFiles = counts.typescript + counts.javascript;
  const tsPercentage = Math.round((counts.typescript / totalFiles) * 100);
  
  console.log(`\nTypeScript Conversion Progress: ${tsPercentage}%`);
  console.log(`TypeScript Files: ${counts.typescript}`);
  console.log(`JavaScript Files: ${counts.javascript}`);
  console.log(`Total Files: ${totalFiles}`);
  console.log(`Interface Files: ${counts.interfaceFiles}`);
  console.log(`Type Usages: ${counts.typesInFiles}`);
  
  console.log('\nComponent Status:');
  for (const component of targetComponents) {
    const status = componentStatus[component] || 'Not Found';
    const statusIcon = status === 'TypeScript' ? '✅' : 
                       status === 'JavaScript' ? '⏳' : '❓';
    console.log(`${statusIcon} ${component}: ${status}`);
  }
  
  console.log('\nComponent Type Summary:');
  for (const [type, count] of Object.entries(counts.componentsByType)) {
    console.log(`- ${type}: ${count}`);
  }
  
  console.log('\nRecommendations:');
  if (tsPercentage < 50) {
    console.log('- Focus on converting core visualization components to TypeScript');
    console.log('- Start with creating interfaces for all data structures');
  } else if (tsPercentage < 80) {
    console.log('- Continue converting remaining JavaScript components');
    console.log('- Ensure proper type checking with strict null checks');
  } else {
    console.log('- Focus on finalizing remaining component conversions');
    console.log('- Perform a TypeScript lint check to identify any remaining issues');
    console.log('- Consider enabling stricter TypeScript options in tsconfig.json');
  }
}

generateReport().catch(console.error); 