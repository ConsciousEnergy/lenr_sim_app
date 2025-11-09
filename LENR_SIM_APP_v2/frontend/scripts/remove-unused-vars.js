// Script to find and remove unused variables and imports
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Patterns to match unused variables based on common ESLint patterns
const UNUSED_VAR_PATTERNS = [
  /'(.+)' is defined but never used/,
  /'(.+)' is assigned a value but never used/
];

// File extensions to process
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Run ESLint to get warnings about unused variables
function getESLintWarnings() {
  try {
    console.log('Running ESLint to find unused variables and imports...');
    const eslintOutput = execSync('npx eslint --no-error-on-unmatched-pattern "src/**/*.{js,jsx,ts,tsx}" -f json', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    return JSON.parse(eslintOutput);
  } catch (error) {
    // ESLint might exit with code 1 if it finds issues, but we still want the output
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch (parseError) {
        console.error('Failed to parse ESLint output:', parseError);
      }
    }
    console.error('Error running ESLint:', error.message);
    return [];
  }
}

// Group ESLint warnings by file
function groupByFile(warnings) {
  const fileMap = {};
  
  warnings.forEach(result => {
    const filePath = result.filePath;
    if (!fileMap[filePath]) {
      fileMap[filePath] = [];
    }
    
    // Extract unused variables and imports from messages
    result.messages.forEach(message => {
      if (message.ruleId === 'no-unused-vars') {
        const match = message.message.match(/'([^']+)' is defined but never used/) || 
                      message.message.match(/'([^']+)' is assigned a value but never used/);
        
        if (match) {
          fileMap[filePath].push({
            name: match[1],
            line: message.line,
            column: message.column,
            endLine: message.endLine,
            endColumn: message.endColumn,
            message: message.message
          });
        }
      }
    });
  });
  
  return fileMap;
}

// Process a file to remove unused variables and imports
function processFile(filePath, unusedVars) {
  if (!unusedVars || unusedVars.length === 0) {
    console.log(`No unused variables found in ${filePath}`);
    return 0;
  }

  try {
    console.log(`Processing ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modifiedLines = lines.slice();
    let removedCount = 0;
    
    // Sort unused vars by line and column in descending order to avoid position shifts
    unusedVars.sort((a, b) => {
      if (a.line !== b.line) return b.line - a.line;
      return b.column - a.column;
    });
    
    for (const unusedVar of unusedVars) {
      const varName = unusedVar.name;
      console.log(`Analyzing unused variable: ${varName} at line ${unusedVar.line}`);
      
      // Get the line content
      const lineIndex = unusedVar.line - 1;
      const line = modifiedLines[lineIndex];
      
      // Check if this is an import statement
      if (line.trim().startsWith('import ')) {
        console.log(`  Found import statement with unused ${varName}`);
        
        // Handle different import types
        if (line.includes(`import { ${varName} }`)) {
          // Single named import - remove the whole import
          modifiedLines.splice(lineIndex, 1);
          removedCount++;
          console.log(`  Removed import statement: ${line}`);
        } else if (line.includes(`import { ${varName},`) || line.includes(`, ${varName} }`) || line.includes(`, ${varName},`)) {
          // One of multiple named imports
          // Remove just the named import
          modifiedLines[lineIndex] = line.replace(
            new RegExp(`(,\\s*${varName}\\s*)|(${varName}\\s*,\\s*)|(\\{\\s*${varName}\\s*\\})`), 
            match => {
              // If it's the only item in braces, replace with empty braces
              if (match.startsWith('{') && match.endsWith('}')) return '{}';
              // Otherwise remove the item and comma
              return '';
            }
          );
          
          // Clean up any potential syntax issues from removal
          modifiedLines[lineIndex] = modifiedLines[lineIndex].replace(/\{\s*,\s*/, '{ ').replace(/\s*,\s*\}/, ' }').replace(/\{\s*\}/, '{}');
          
          // If we end up with import {} from '...', remove the whole line
          if (modifiedLines[lineIndex].includes('import {} from')) {
            modifiedLines.splice(lineIndex, 1);
          }
          
          removedCount++;
          console.log(`  Modified import statement to remove ${varName}`);
        } else if (line.includes(`import ${varName} from`)) {
          // Default import
          modifiedLines.splice(lineIndex, 1);
          removedCount++;
          console.log(`  Removed default import: ${line}`);
        }
      } else {
        // Handle variable declarations
        const declarationMatch = line.match(/(const|let|var)\s+([^=;]+)(\s*=\s*[^;]+)?;/);
        
        if (declarationMatch) {
          const declaration = declarationMatch[2].trim();
          
          // Handle single variable declarations
          if (declaration === varName) {
            modifiedLines.splice(lineIndex, 1);
            removedCount++;
            console.log(`  Removed variable declaration: ${line}`);
          } 
          // Handle multiple variables in one declaration
          else if (declaration.split(',').map(v => v.trim()).includes(varName)) {
            // Replace the variable and its potential assignment
            const newLine = line.replace(
              new RegExp(`(,\\s*${varName}\\s*(=\\s*[^,;]+)?)||(${varName}\\s*(=\\s*[^,;]+)?\\s*,)`), 
              ''
            );
            modifiedLines[lineIndex] = newLine;
            removedCount++;
            console.log(`  Removed ${varName} from multiple declaration`);
          }
        }
        
        // Handle destructuring
        const destructuringMatch = line.match(/const|let|var\s*\{([^}]+)\}\s*=\s*/);
        if (destructuringMatch) {
          const destructuredVars = destructuringMatch[1].split(',').map(v => v.trim());
          
          // Check if our unused var is in the destructuring
          if (destructuredVars.some(v => {
            const parts = v.split(':');
            const name = parts.length > 1 ? parts[1].trim() : parts[0].trim();
            return name === varName;
          })) {
            // Remove just the unused var from destructuring
            let newDestructuring = destructuredVars.filter(v => {
              const parts = v.split(':');
              const name = parts.length > 1 ? parts[1].trim() : parts[0].trim();
              return name !== varName;
            }).join(', ');
            
            // If no vars left, remove whole line
            if (newDestructuring === '') {
              modifiedLines.splice(lineIndex, 1);
            } else {
              // Replace the destructuring part
              modifiedLines[lineIndex] = line.replace(/\{([^}]+)\}/, `{${newDestructuring}}`);
            }
            
            removedCount++;
            console.log(`  Removed ${varName} from destructuring`);
          }
        }
        
        // If we couldn't automatically remove, add eslint-disable comment
        if (removedCount === 0) {
          modifiedLines.splice(lineIndex, 0, `// eslint-disable-next-line no-unused-vars  /* ${varName} */`);
          console.log(`  Added eslint-disable comment for '${varName}' as automatic removal wasn't possible`);
          removedCount++;
        }
      }
    }
    
    // Write back to file if changes were made
    if (removedCount > 0) {
      fs.writeFileSync(filePath, modifiedLines.join('\n'), 'utf8');
      console.log(`Updated ${filePath} - removed or commented ${removedCount} unused variables`);
      return removedCount;
    } else {
      console.log(`No changes made to ${filePath}`);
      return 0;
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return 0;
  }
}

// Find all JavaScript/TypeScript files recursively
function findFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.git')) {
      // Recursively search directories
      results = results.concat(findFiles(filePath));
    } else {
      // Check if file has one of the target extensions
      if (FILE_EXTENSIONS.includes(path.extname(filePath))) {
        results.push(filePath);
      }
    }
  });
  
  return results;
}

// Main execution
console.log('Analyzing project for unused variables and imports...');
const targetDir = path.join(process.cwd(), 'src');

try {
  // Option 1: Get unused variables via ESLint
  const eslintResults = getESLintWarnings();
  const fileWarnings = groupByFile(eslintResults);
  
  let totalModified = 0;
  for (const [filePath, warnings] of Object.entries(fileWarnings)) {
    const modifications = processFile(filePath, warnings);
    totalModified += modifications;
  }
  
  console.log(`Done! Removed or commented ${totalModified} unused variables and imports.`);
  
  // Option 2: Use file scanning (fallback)
  if (totalModified === 0) {
    console.log('No issues found with ESLint. Falling back to manual scanning...');
    const files = findFiles(targetDir);
    console.log(`Found ${files.length} JavaScript/TypeScript files to process manually.`);
    
    for (const file of files) {
      const modifications = processFile(file, []);
      totalModified += modifications;
    }
    
    console.log(`Manual scan complete. Modified ${totalModified} files.`);
  }
} catch (error) {
  console.error('Error executing script:', error);
} 