/**
 * TypeScript Conversion Verification Script
 * 
 * This script checks the status of the TypeScript conversion for the UnifiedLENRVisualizer component
 * by performing static analysis and verification of the TypeScript implementation.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Config - paths for verification
const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, 'frontend');
const componentPath = path.join(frontendDir, 'src/components/visualization/UnifiedLENRVisualizer.tsx');
const originalJsxPath = path.join(frontendDir, 'src/components/visualization/UnifiedLENRVisualizer.jsx');

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Utility functions for console output
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.warn(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}=== ${msg} ===${colors.reset}\n`),
};

// Check if TypeScript component exists
function verifyComponentExists() {
  log.header('Checking Component Files');
  
  if (!fs.existsSync(componentPath)) {
    log.error(`TypeScript component not found at: ${componentPath}`);
    return false;
  }
  
  log.success(`TypeScript component found at: ${componentPath}`);
  
  // Check if original JSX file still exists for comparison
  if (fs.existsSync(originalJsxPath)) {
    log.info(`Original JSX component found at: ${originalJsxPath}`);
    log.info('Both TypeScript and JavaScript versions are available for comparison');
  } else {
    log.warning('Original JSX component not found. Only TypeScript version exists.');
  }
  
  return true;
}

// Check TypeScript interfaces
function analyzeTypeScriptInterfaces() {
  log.header('Analyzing TypeScript Interfaces');
  
  try {
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Look for essential interfaces
    const interfaceAnalysis = [
      { name: 'Props Interface', pattern: /interface\s+(\w+Props)\s*\{/g, required: true },
      { name: 'Visualization Data', pattern: /interface\s+VisualizationData\s*\{/g, required: true },
      { name: 'WebGL Capabilities', pattern: /interface\s+WebGLCapabilities\s*\{/g, required: true },
      { name: 'Component State', pattern: /interface\s+\w*State\s*\{/g, required: false },
      { name: 'THREE.js Refs', pattern: /interface\s+\w*Refs\s*\{/g, required: false },
    ];
    
    let score = 0;
    const maxScore = interfaceAnalysis.filter(item => item.required).length;
    
    for (const check of interfaceAnalysis) {
      const matches = [...content.matchAll(check.pattern)];
      
      if (matches.length > 0) {
        log.success(`✓ ${check.name} found: ${matches.map(m => m[0]).join(', ')}`);
        if (check.required) score++;
      } else if (check.required) {
        log.error(`✗ Required ${check.name} not found!`);
      } else {
        log.warning(`⚠ Optional ${check.name} not found`);
      }
    }
    
    // Check typed useState hooks
    const useStateTyped = content.match(/useState<\w+(\[\])?>/g);
    if (useStateTyped && useStateTyped.length > 0) {
      log.success(`✓ Found ${useStateTyped.length} typed useState hooks`);
    } else {
      log.warning('⚠ No typed useState hooks found');
    }
    
    // Check typed useRef hooks
    const useRefTyped = content.match(/useRef<\w+(\s*\|\s*\w+)?(\s*\|\s*null)?>/g);
    if (useRefTyped && useRefTyped.length > 0) {
      log.success(`✓ Found ${useRefTyped.length} typed useRef hooks`);
    } else {
      log.warning('⚠ No typed useRef hooks found');
    }
    
    // Calculate completeness percentage
    const completeness = Math.round((score / maxScore) * 100);
    log.info(`Interface implementation: ${completeness}% complete (${score}/${maxScore} required interfaces)`);
    
    return completeness >= 100;
  } catch (error) {
    log.error(`Error analyzing TypeScript interfaces: ${error.message}`);
    return false;
  }
}

// Check TypeScript compilation
function verifyTypeScriptCompilation() {
  log.header('Verifying TypeScript Compilation');
  
  try {
    log.info('Running TypeScript compiler check...');
    const result = execSync('npx tsc --noEmit --project tsconfig.json', {
      cwd: frontendDir,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    
    log.success('TypeScript compilation successful - no errors found!');
    return true;
  } catch (error) {
    log.error('TypeScript compilation failed with errors:');
    
    // Extract error messages and format them for better readability
    const errorOutput = error.stdout || error.message;
    
    // Find TS errors specifically for our component
    const componentErrors = errorOutput
      .split('\n')
      .filter(line => line.includes('UnifiedLENRVisualizer.tsx'))
      .map(line => {
        // Simplify error messages for readability
        return line.replace(componentPath, 'UnifiedLENRVisualizer.tsx');
      });
    
    if (componentErrors.length > 0) {
      log.error(`Found ${componentErrors.length} errors in UnifiedLENRVisualizer.tsx:`);
      componentErrors.forEach(err => console.log(`  ${err}`));
    } else {
      log.info('No specific errors found for UnifiedLENRVisualizer.tsx');
      log.info('Errors might be in dependencies or other files');
    }
    
    return false;
  }
}

// Calculate conversion percentage
function calculateConversionPercentage() {
  log.header('Calculating TypeScript Conversion Percentage');
  
  try {
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Define key sections to check for TypeScript typing
    const sections = [
      { name: 'Interfaces', pattern: /interface\s+\w+\s*\{/g, weight: 25 },
      { name: 'Typed Hooks', pattern: /use(State|Ref|Effect|Callback)<[\w\s|[\]]+>/g, weight: 25 },
      { name: 'Type Annotations', pattern: /:\s*(string|number|boolean|[\w\s|[\]<>]+)\s*[,)=;]/g, weight: 25 },
      { name: 'Type Guards', pattern: /(instanceof|typeof|as\s+[\w<>[\]]+)/g, weight: 15 },
      { name: 'Generic Functions', pattern: /<[A-Z][\w\s]*>\s*\(/g, weight: 10 },
    ];
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const section of sections) {
      const matches = content.match(section.pattern) || [];
      const maxItems = 10; // Normalize score with max 10 per section
      const count = Math.min(matches.length, maxItems);
      const sectionScore = (count / maxItems) * section.weight;
      
      log.info(`${section.name}: Found ${matches.length} items (${Math.round(sectionScore)}/${section.weight} points)`);
      totalScore += sectionScore;
      totalWeight += section.weight;
      
      // Display some examples
      if (matches.length > 0) {
        const examples = matches.slice(0, 3);
        log.info(`  Examples: ${examples.join(', ')}`);
      }
    }
    
    // Calculate final percentage
    const percentage = Math.round((totalScore / totalWeight) * 100);
    
    if (percentage >= 80) {
      log.success(`TypeScript conversion is approximately ${percentage}% complete!`);
    } else if (percentage >= 50) {
      log.info(`TypeScript conversion is approximately ${percentage}% complete`);
    } else {
      log.warning(`TypeScript conversion is only approximately ${percentage}% complete`);
    }
    
    return percentage;
  } catch (error) {
    log.error(`Error calculating conversion percentage: ${error.message}`);
    return 0;
  }
}

// Compare with original implementation
function compareImplementations() {
  log.header('Comparing Implementations');
  
  if (!fs.existsSync(originalJsxPath)) {
    log.warning('Original JSX component not found. Cannot compare implementations.');
    return;
  }
  
  try {
    const tsContent = fs.readFileSync(componentPath, 'utf8');
    const jsxContent = fs.readFileSync(originalJsxPath, 'utf8');
    
    // Compare key function and hook signatures
    const functionComparison = [
      { name: 'Component Definition', jsxPattern: /const\s+UnifiedLENRVisualizer\s*=\s*\(\s*\{/g, tsPattern: /const\s+UnifiedLENRVisualizer\s*:\s*React\.FC[^{]*\{/g },
      { name: 'WebGL Capabilities', jsxPattern: /const\s+detectWebGLCapabilities\s*=\s*\(\s*\)\s*=>/g, tsPattern: /const\s+detectWebGLCapabilities\s*=\s*\(\s*\)\s*:\s*WebGLCapabilities\s*=>/g },
      { name: 'Rendering Settings', jsxPattern: /const\s+getOptimalRenderingSettings\s*=\s*\(\s*capabilities\s*\)\s*=>/g, tsPattern: /const\s+getOptimalRenderingSettings\s*=\s*\(\s*capabilities\s*:.*\)\s*:\s*RenderSettings\s*=>/g },
    ];
    
    let matchedFunctions = 0;
    const totalFunctions = functionComparison.length;
    
    for (const fn of functionComparison) {
      const jsxMatch = jsxContent.match(fn.jsxPattern);
      const tsMatch = tsContent.match(fn.tsPattern);
      
      if (jsxMatch && tsMatch) {
        log.success(`✓ ${fn.name} found in both versions`);
        matchedFunctions++;
      } else if (!jsxMatch && tsMatch) {
        log.success(`✓ ${fn.name} added in TypeScript version`);
      } else if (jsxMatch && !tsMatch) {
        log.warning(`⚠ ${fn.name} found in JSX but not properly typed in TypeScript version`);
      } else {
        log.warning(`⚠ ${fn.name} not found in either version`);
      }
    }
    
    if (matchedFunctions === totalFunctions) {
      log.success('All key functions were properly converted to TypeScript!');
    } else {
      log.warning(`Only ${matchedFunctions}/${totalFunctions} key functions were properly converted to TypeScript`);
    }
    
  } catch (error) {
    log.error(`Error comparing implementations: ${error.message}`);
  }
}

// Main function to run all checks
function main() {
  console.log('\n========================================================');
  console.log(`${colors.magenta}TypeScript Conversion Verification${colors.reset}`);
  console.log('========================================================\n');
  
  try {
    const componentExists = verifyComponentExists();
    if (!componentExists) {
      log.error('Cannot proceed without TypeScript component file');
      process.exit(1);
    }
    
    const interfacesValid = analyzeTypeScriptInterfaces();
    const compilationValid = verifyTypeScriptCompilation();
    const conversionPercentage = calculateConversionPercentage();
    compareImplementations();
    
    // Final summary
    log.header('Verification Summary');
    
    if (compilationValid) {
      log.success('✓ TypeScript compilation passes');
    } else {
      log.error('✗ TypeScript compilation fails');
    }
    
    if (interfacesValid) {
      log.success('✓ All required interfaces are implemented');
    } else {
      log.warning('⚠ Some required interfaces are missing');
    }
    
    log.info(`TypeScript conversion is approximately ${conversionPercentage}% complete`);
    
    // Recommend next steps
    log.header('Recommendations');
    
    if (conversionPercentage < 50) {
      log.info('Focus on implementing core TypeScript interfaces and state typing first');
    } else if (conversionPercentage < 80) {
      log.info('Continue adding type annotations to remaining functions and callbacks');
    } else {
      log.info('Finalize TypeScript implementation with comprehensive error handling and edge cases');
    }
    
    console.log('\n========================================================\n');
    
  } catch (error) {
    log.error('Verification failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the verification
main(); 