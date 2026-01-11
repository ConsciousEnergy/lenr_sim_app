/**
 * TypeScript Validation Script
 * 
 * This script does a basic validation that TypeScript is configured properly
 * by attempting to compile the TypeScript files without errors.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Config - modify these paths if needed
const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, 'frontend');
const tsFiles = [
  path.join(frontendDir, 'src/components/visualization/TypeScriptTest.tsx'),
  path.join(frontendDir, 'src/pages/TypeScriptTestPage.tsx'),
  path.join(frontendDir, 'src/components/visualization/UnifiedLENRVisualizer.tsx')
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper to print colored messages
const print = {
  info: msg => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: msg => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  error: msg => console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warning: msg => console.warn(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  header: msg => console.log(`\n${colors.cyan}${msg}${colors.reset}\n`)
};

// Verify TypeScript configuration
function verifyTypeScriptConfig() {
  print.header('Verifying TypeScript Configuration');
  
  // Check if tsconfig.json exists
  const tsconfigPath = path.join(frontendDir, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    print.error(`tsconfig.json not found at ${tsconfigPath}`);
    process.exit(1);
  }
  
  print.success('Found tsconfig.json');
  
  // Check if typescript is installed
  try {
    print.info('Checking for TypeScript installation...');
    execSync('npx tsc --version', { cwd: frontendDir, stdio: 'pipe' });
    print.success('TypeScript is installed');
  } catch (error) {
    print.error('TypeScript is not installed. Please run: npm install -D typescript');
    process.exit(1);
  }
}

// Verify TypeScript files compile without errors
function verifyTSCompilation() {
  print.header('Verifying TypeScript Compilation');
  
  // Check if TS files exist
  for (const file of tsFiles) {
    if (!fs.existsSync(file)) {
      print.warning(`TypeScript file not found: ${file}`);
    } else {
      print.info(`Found file: ${path.relative(projectRoot, file)}`);
    }
  }
  
  // Run tsc to check for errors
  try {
    print.info('Checking TypeScript files for errors...');
    const command = `npx tsc --noEmit --project tsconfig.json`;
    execSync(command, { cwd: frontendDir, stdio: 'pipe' });
    print.success('TypeScript compilation successful - no errors found!');
  } catch (error) {
    print.error('TypeScript compilation failed with errors:');
    console.error(error.stdout?.toString() || error.message);
    process.exit(1);
  }
}

// Main function
function main() {
  console.log('\n=========================================');
  console.log(`${colors.magenta}TypeScript Validation Script${colors.reset}`);
  console.log('=========================================\n');
  
  try {
    verifyTypeScriptConfig();
    verifyTSCompilation();
    
    print.header('Summary');
    print.success('TypeScript is properly configured and files compile without errors');
    print.info('You can now proceed with the incremental TypeScript conversion');
    console.log('\n=========================================\n');
  } catch (error) {
    print.error('Validation failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the validation
main(); 