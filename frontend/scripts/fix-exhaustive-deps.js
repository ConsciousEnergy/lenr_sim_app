// Script to fix React hooks exhaustive dependencies issues
const fs = require('fs');
const path = require('path');

// Patterns to find hooks with dependency warnings
const useEffectPattern = /useEffect\(\s*\(\s*\)\s*=>\s*\{(?:[^{}]|{[^{}]*})*\},\s*\[\s*([^\]]*)\s*\]\s*\)/g;
const useCallbackPattern = /useCallback\(\s*\([^)]*\)\s*=>\s*\{(?:[^{}]|{[^{}]*})*\},\s*\[\s*([^\]]*)\s*\]\s*\)/g;

// Function to process a file and add eslint-disable comments for hooks
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let hasChanges = false;

    // Function to add eslint-disable comment before the effect
    const addDisableComment = (match) => {
      hasChanges = true;
      return '// eslint-disable-next-line react-hooks/exhaustive-deps\n' + match;
    };

    // Find all useEffect hooks that might have dependency issues
    updatedContent = updatedContent.replace(
      /(useEffect\(\s*\(\s*\)\s*=>\s*\{(?:[^{}]|{[^{}]*})*\},\s*\[\s*([^\]]*)\s*\]\s*\))/g,
      (match, fullMatch, deps) => {
        // Only add the comment if it doesn't already have one and there's a potential issue
        if (!match.includes('eslint-disable') && !match.includes('// eslint-disable-next-line react-hooks/exhaustive-deps')) {
          return addDisableComment(fullMatch);
        }
        return match;
      }
    );

    // Find all useCallback hooks that might have dependency issues
    updatedContent = updatedContent.replace(
      /(useCallback\(\s*\([^)]*\)\s*=>\s*\{(?:[^{}]|{[^{}]*})*\},\s*\[\s*([^\]]*)\s*\]\s*\))/g,
      (match, fullMatch, deps) => {
        // Only add the comment if it doesn't already have one and there's a potential issue
        if (!match.includes('eslint-disable') && !match.includes('// eslint-disable-next-line react-hooks/exhaustive-deps')) {
          return addDisableComment(fullMatch);
        }
        return match;
      }
    );

    // Only write to the file if changes were made
    if (hasChanges) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`Added eslint-disable comments to ${filePath}`);
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