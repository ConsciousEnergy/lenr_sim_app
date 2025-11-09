// Script to remove unnecessary React imports from JSX files
const fs = require('fs');
const path = require('path');

// Pattern to find standalone React imports
const STANDALONE_REACT_IMPORT = /^import\s+React\s+from\s+['"]react['"];?\s*$/m;

// Pattern to find React in a list of imports
const REACT_IN_IMPORTS = /^import\s+React,\s*({[^}]*})\s+from\s+['"]react['"];?\s*$/m;

// Function to process a file and remove React import if not used in the file
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;

    // Check for standalone React import
    if (STANDALONE_REACT_IMPORT.test(content)) {
      updatedContent = content.replace(STANDALONE_REACT_IMPORT, '');
      console.log(`Removed standalone React import from ${filePath}`);
    }
    
    // Check for React in a list of imports
    const reactWithOtherImportsMatch = content.match(REACT_IN_IMPORTS);
    if (reactWithOtherImportsMatch) {
      const otherImports = reactWithOtherImportsMatch[1];
      updatedContent = content.replace(
        REACT_IN_IMPORTS, 
        `import ${otherImports} from 'react';`
      );
      console.log(`Removed React from import list in ${filePath}`);
    }

    // Only write to the file if changes were made
    if (updatedContent !== content) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

// Function to recursively find files with extensions
function findFiles(dir, extensions, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, extensions, fileList);
    } else if (extensions.includes(path.extname(file).toLowerCase())) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Find all JavaScript and TypeScript files in the src directory
console.log('Scanning for files...');
const srcDir = path.resolve(__dirname, '..', 'src');
const extensions = ['.js', '.jsx', '.ts', '.tsx'];
const files = findFiles(srcDir, extensions);

console.log(`Found ${files.length} files. Processing...`);

// Process each file
files.forEach(filePath => {
  processFile(filePath);
});

console.log('Done!'); 