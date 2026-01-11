#!/usr/bin/env node

/**
 * Script to automatically fix common ESLint warnings in the LENR Simulation App
 * Focuses on unused imports, variables, and simple fixes
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  srcDir: path.join(__dirname, '../src'),
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose')
};

// Pattern to match unused imports
const unusedImportPatterns = {
  // Match: import { Something } from 'module' where Something is unused
  namedImports: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g,
  // Match: import Something from 'module' where Something is unused
  defaultImports: /import\s+([A-Z][a-zA-Z0-9_]*)\s+from\s*['"]([^'"]+)['"]/g,
};

// Common unused variables from the warnings
const commonUnusedVars = new Set([
  'Text', 'Title', 'Divider', 'Button', 'Grid', 'Stack', 'Card', 'CardContent',
  'Paper', 'Chip', 'Alert', 'Badge', 'TextField', 'InputAdornment', 'Tooltip',
  'FormControlLabel', 'Switch', 'useEffect', 'useRef', 'useCallback', 'useMemo',
  'CheckCircleOutlined', 'Skeleton', 'InfoIcon', 'SettingsIcon', 'GetAppIcon',
  'CloudUploadIcon', 'CloudDownloadIcon', 'AddIcon', 'RefreshIcon', 'RestoreIcon',
  'InfoOutlinedIcon', 'FullscreenExitIcon', 'ScienceIcon', 'ZoomInIcon', 'TimelineIcon',
  'BarChartIcon', 'CopyIcon', 'SyncAltIcon', 'BookmarkIcon', 'BookmarkBorderIcon',
  'ListItemSecondaryAction', 'ScatterChart', 'Scatter', 'ZAxis', 'Surface', 'Contour',
  'ReferenceLine', 'THREE', 'SimulationUpdateMessage', 'ThemeIcon', 'ParameterUpdateMessage',
  'ParameterUpdate', 'TimeSeriesDataPoint', 'SimulationResult', 'LatticeState', 'ColorMap'
]);

// Files to process
const filesToProcess = [];

// Helper function to recursively find files
function findFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
      findFiles(fullPath);
    } else if (stat.isFile() && config.extensions.some(ext => file.endsWith(ext))) {
      filesToProcess.push(fullPath);
    }
  });
}

// Process a single file
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const changes = [];
  
  // Check for unused imports in the file
  const lines = content.split('\n');
  const modifiedLines = [];
  
  lines.forEach((line, index) => {
    let modifiedLine = line;
    
    // Check if line contains an import statement
    if (line.includes('import ') && line.includes(' from ')) {
      // Parse named imports
      const namedMatch = line.match(/import\s*{\s*([^}]+)\s*}\s*from/);
      if (namedMatch) {
        const imports = namedMatch[1].split(',').map(i => i.trim());
        const usedImports = [];
        const unusedImports = [];
        
        imports.forEach(imp => {
          // Extract the actual import name (handle 'as' aliases)
          const importName = imp.split(' as ')[0].trim();
          const aliasName = imp.includes(' as ') ? imp.split(' as ')[1].trim() : importName;
          
          // Check if this import is in our known unused list
          if (commonUnusedVars.has(importName) || commonUnusedVars.has(aliasName)) {
            // Double-check if it's actually used in the file (excluding the import line)
            const restOfFile = lines.slice(index + 1).join('\n');
            const isUsed = new RegExp(`\\b${aliasName}\\b`).test(restOfFile);
            
            if (!isUsed) {
              unusedImports.push(imp);
              changes.push(`Removed unused import: ${imp}`);
            } else {
              usedImports.push(imp);
            }
          } else {
            usedImports.push(imp);
          }
        });
        
        // Rebuild the import line if we removed any imports
        if (unusedImports.length > 0) {
          if (usedImports.length > 0) {
            modifiedLine = line.replace(
              /import\s*{\s*[^}]+\s*}/,
              `import { ${usedImports.join(', ')} }`
            );
            modified = true;
          } else {
            // Remove the entire import line if no imports remain
            modifiedLine = '';
            modified = true;
          }
        }
      }
      
      // Check default imports
      const defaultMatch = line.match(/import\s+([A-Z][a-zA-Z0-9_]*)\s+from/);
      if (defaultMatch) {
        const importName = defaultMatch[1];
        if (commonUnusedVars.has(importName)) {
          const restOfFile = lines.slice(index + 1).join('\n');
          const isUsed = new RegExp(`\\b${importName}\\b`).test(restOfFile);
          
          if (!isUsed) {
            modifiedLine = '';
            modified = true;
            changes.push(`Removed unused default import: ${importName}`);
          }
        }
      }
    }
    
    // Skip empty lines created by removing imports
    if (modifiedLine !== '' || line !== '') {
      modifiedLines.push(modifiedLine);
    }
  });
  
  // Clean up multiple consecutive empty lines
  const cleanedContent = modifiedLines.join('\n').replace(/\n{3,}/g, '\n\n');
  
  if (modified) {
    if (!config.dryRun) {
      fs.writeFileSync(filePath, cleanedContent);
    }
    
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`✓ Fixed ${relativePath}`);
    if (config.verbose) {
      changes.forEach(change => console.log(`  - ${change}`));
    }
    
    return { filePath: relativePath, changes };
  }
  
  return null;
}

// Main execution
console.log('🔧 Fixing ESLint warnings...\n');
console.log(`Mode: ${config.dryRun ? 'DRY RUN' : 'FIXING'}`);
console.log(`Verbose: ${config.verbose ? 'ON' : 'OFF'}\n`);

// Find all files
findFiles(config.srcDir);

console.log(`Found ${filesToProcess.length} files to process\n`);

// Process each file
const results = [];
let processedCount = 0;

filesToProcess.forEach(file => {
  const result = processFile(file);
  if (result) {
    results.push(result);
    processedCount++;
  }
});

// Summary
console.log('\n📊 Summary:');
console.log(`Files processed: ${filesToProcess.length}`);
console.log(`Files modified: ${processedCount}`);

if (config.dryRun) {
  console.log('\n⚠️  This was a dry run. No files were actually modified.');
  console.log('Run without --dry-run to apply the fixes.');
}

// Export results for testing
module.exports = { processFile, findFiles };
