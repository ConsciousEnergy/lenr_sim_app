/**
 * Accessibility Testing Script
 * 
 * This script tests form components for accessibility compliance
 * Run with: node src/tests/accessibility-test.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Accessibility patterns to check
const accessibilityPatterns = {
  // Check for form inputs without id or name
  inputWithoutId: /<input(?![^>]*\bid\s*=)[^>]*>/gi,
  inputWithoutName: /<input(?![^>]*\bname\s*=)[^>]*>/gi,
  
  // Check for labels without htmlFor
  labelWithoutFor: /<label(?![^>]*\b(htmlFor|for)\s*=)[^>]*>/gi,
  
  // Check for select without id or name
  selectWithoutId: /<select(?![^>]*\bid\s*=)[^>]*>/gi,
  selectWithoutName: /<select(?![^>]*\bname\s*=)[^>]*>/gi,
  
  // Check for MUI Select components without proper attributes
  muiSelectWithoutId: /<Select(?![^>]*\bid\s*=)(?![^>]*\binputProps\s*=)[^>]*>/gi,
  muiSelectWithoutName: /<Select(?![^>]*\bname\s*=)(?![^>]*\binputProps\s*=)[^>]*>/gi,
  
  // Check for aria attributes
  ariaDescribedBy: /aria-describedby/gi,
  ariaLabel: /aria-label/gi,
  ariaInvalid: /aria-invalid/gi,
  
  // Check for proper associations
  labelHtmlFor: /htmlFor\s*=\s*["']([^"']+)["']/gi,
  inputId: /id\s*=\s*["']([^"']+)["']/gi
};

// Files to check - using actual components found in LENR_SIM_APP_v2
const projectRoot = path.resolve(__dirname, '../..');
const filesToCheck = [
  // Main simulation components
  path.join(projectRoot, 'src/components/SimulationControls.jsx'),
  path.join(projectRoot, 'src/components/SimulationDashboard.jsx'),
  path.join(projectRoot, 'src/components/SimulationMonitor.jsx'),
  path.join(projectRoot, 'src/components/SimulationStatusPanel.jsx'),
  path.join(projectRoot, 'src/components/SimulationResults.jsx'),
  path.join(projectRoot, 'src/components/SimulationHistory.jsx'),
  
  // Visualization components
  path.join(projectRoot, 'src/components/visualization/UnifiedLENRVisualizer.jsx'),
  path.join(projectRoot, 'src/components/visualization/FluidDynamicsVisualizer_new.jsx'),
  
  // UI components (if they exist)
  path.join(projectRoot, 'src/components/ui/Input.jsx'),
  path.join(projectRoot, 'src/components/ui/Form.jsx'),
  path.join(projectRoot, 'src/components/ui/Select.jsx'),
];

// Check a single file
function checkFile(filePath) {
  const relativePath = path.relative(projectRoot, filePath);
  console.log(`\n${colors.blue}Checking: ${relativePath}${colors.reset}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    // Check for inputs without ID
    const inputsWithoutId = content.match(accessibilityPatterns.inputWithoutId) || [];
    inputsWithoutId.forEach(match => {
      // Skip if it's a type="hidden" or aria-hidden="true"
      if (!match.includes('type="hidden"') && !match.includes('aria-hidden="true"')) {
        issues.push({
          type: 'error',
          message: `Input without ID: ${match.substring(0, 50)}...`
        });
      }
    });
    
    // Check for inputs without name
    const inputsWithoutName = content.match(accessibilityPatterns.inputWithoutName) || [];
    inputsWithoutName.forEach(match => {
      // Skip if it's a type="hidden" or aria-hidden="true"
      if (!match.includes('type="hidden"') && !match.includes('aria-hidden="true"')) {
        issues.push({
          type: 'error',
          message: `Input without name: ${match.substring(0, 50)}...`
        });
      }
    });
    
    // Check for labels without htmlFor
    const labelsWithoutFor = content.match(accessibilityPatterns.labelWithoutFor) || [];
    labelsWithoutFor.forEach(match => {
      issues.push({
        type: 'error',
        message: `Label without htmlFor: ${match.substring(0, 50)}...`
      });
    });
    
    // Check for select elements without ID
    const selectsWithoutId = content.match(accessibilityPatterns.selectWithoutId) || [];
    selectsWithoutId.forEach(match => {
      issues.push({
        type: 'error',
        message: `Select without ID: ${match.substring(0, 50)}...`
      });
    });
    
    // Check for select elements without name
    const selectsWithoutName = content.match(accessibilityPatterns.selectWithoutName) || [];
    selectsWithoutName.forEach(match => {
      issues.push({
        type: 'error',
        message: `Select without name: ${match.substring(0, 50)}...`
      });
    });
    
    // Check for MUI Select components without proper attributes
    const muiSelectMatches = content.match(/<Select[^>]*>/gi) || [];
    muiSelectMatches.forEach(match => {
      if (!match.includes('id=') && !match.includes('inputProps')) {
        issues.push({
          type: 'warning',
          message: `MUI Select might be missing ID: ${match.substring(0, 50)}...`
        });
      }
      if (!match.includes('name=') && !match.includes('inputProps')) {
        issues.push({
          type: 'warning',
          message: `MUI Select might be missing name: ${match.substring(0, 50)}...`
        });
      }
    });
    
    // Check for accessibility attributes (positive checks)
    const ariaDescribedByCount = (content.match(accessibilityPatterns.ariaDescribedBy) || []).length;
    const ariaLabelCount = (content.match(accessibilityPatterns.ariaLabel) || []).length;
    
    // Report results
    if (issues.length === 0) {
      console.log(`${colors.green}✓ No accessibility issues found${colors.reset}`);
      console.log(`  - Found ${ariaDescribedByCount} aria-describedby attributes`);
      console.log(`  - Found ${ariaLabelCount} aria-label attributes`);
    } else {
      console.log(`${colors.red}✗ Found ${issues.length} potential issues:${colors.reset}`);
      issues.forEach(issue => {
        const icon = issue.type === 'error' ? '✗' : '⚠';
        const color = issue.type === 'error' ? colors.red : colors.yellow;
        console.log(`  ${color}${icon} ${issue.message}${colors.reset}`);
      });
    }
    
    return issues;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`${colors.yellow}⚠ File not found: ${relativePath}${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Error reading file: ${error.message}${colors.reset}`);
    }
    return [];
  }
}

// Main function
function runAccessibilityTests() {
  console.log(`${colors.blue}=== Accessibility Test Report ===${colors.reset}`);
  console.log(`Testing ${filesToCheck.length} files for accessibility compliance\n`);
  
  let totalIssues = 0;
  let filesWithIssues = 0;
  let filesNotFound = 0;
  let filesChecked = 0;
  
  filesToCheck.forEach(file => {
    if (!fs.existsSync(file)) {
      filesNotFound++;
      const relativePath = path.relative(projectRoot, file);
      console.log(`\n${colors.yellow}⚠ File not found: ${relativePath}${colors.reset}`);
      return;
    }
    
    filesChecked++;
    const issues = checkFile(file);
    if (issues.length > 0) {
      totalIssues += issues.length;
      filesWithIssues++;
    }
  });
  
  // Summary
  console.log(`\n${colors.blue}=== Summary ===${colors.reset}`);
  console.log(`Files checked: ${filesChecked}`);
  
  if (filesNotFound > 0) {
    console.log(`${colors.yellow}⚠ ${filesNotFound} files were not found${colors.reset}`);
  }
  
  if (totalIssues === 0 && filesNotFound === 0) {
    console.log(`${colors.green}✓ All files passed accessibility checks!${colors.reset}`);
  } else if (totalIssues > 0) {
    console.log(`${colors.red}✗ Found ${totalIssues} issues in ${filesWithIssues} files${colors.reset}`);
    console.log(`\n${colors.yellow}Recommendations:${colors.reset}`);
    console.log('1. Ensure all form inputs have unique ID and name attributes');
    console.log('2. Associate all labels with their form controls using htmlFor');
    console.log('3. Add aria-describedby for helper text associations');
    console.log('4. Use aria-label for controls without visible labels');
    console.log('5. Add aria-invalid and aria-errormessage for validation');
  }
}

// Run the tests
runAccessibilityTests(); 