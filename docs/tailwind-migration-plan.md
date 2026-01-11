# LENR Simulation App - Tailwind CSS Migration Plan

## Overview

The LENR Simulation App currently uses a mixture of component libraries (Material UI, Ant Design) alongside some Tailwind CSS. This migration plan outlines our structured approach to standardize on Tailwind CSS across the frontend.

## Implementation Roadmap

Based on our task management structure, we will implement the migration in the following sequence:

### Phase 1: Foundation Setup (Completed)

**Task 1: Optimize Tailwind Configuration** (Completed)
- ✅ Update tailwind.config.js to v4.1.3 standards, enabling JIT mode
- ✅ Configure content paths to correctly identify all style usage
- ✅ Set up purging of unused styles for production builds
- ✅ Document custom color palette and design tokens in the configuration
- ✅ Configure reasonable defaults for common component patterns

### Phase 2: Component Conversion (Current Focus)

**Task 2: Convert Layout Components to Tailwind** (In Progress)
- Identify all shared layout components (header, footer, sidebar, etc.)
- Remove Material UI and Ant Design dependencies from these components
- Reimplement the styling using Tailwind classes
- Ensure dark mode support is properly implemented
- Verify consistent spacing and alignment

**Task 3: Build Reusable Tailwind UI Component Library** (Pending)
- Develop Tailwind-based components for buttons, cards, inputs, and other common UI elements
- Implement consistent spacing, typography, and color usage
- Create variants for different states and use cases
- Ensure accessibility compliance with proper ARIA attributes
- Document usage patterns and props for each component

**Task 4: Convert Core UI Elements to Tailwind** (Pending)
- Identify all core UI elements currently using Material UI or Ant Design
- Replace them with the new Tailwind components
- Update props and event handlers as needed
- Ensure consistent styling based on design system values
- Remove unnecessary Material UI and Ant Design imports

### Phase 3: Enhancement and Optimization (Pending)

**Task 5: Implement Responsive Design Patterns** (Pending)
- Implement mobile-first responsive layouts
- Ensure visualizations and simulation displays resize appropriately
- Apply consistent breakpoint usage across the application
- Test and optimize for various device sizes and orientations
- Fix any existing responsive design issues

**Task 6: Develop Developer Migration Guide** (Pending)
- Document the new Tailwind configuration and usage patterns
- Create migration examples for common component patterns
- Provide guidance on converting Material UI and Ant Design components
- Document component transition status for tracking progress
- Include best practices for using Tailwind in the project

**Task 7: Bundle Optimization and Cleanup** (Pending)
- Remove Material UI and Ant Design dependencies where no longer needed
- Optimize Tailwind CSS bundle for production
- Measure and document bundle size improvements
- Clean up any remaining CSS files that are no longer needed
- Ensure build process properly eliminates unused styles

## Success Criteria

- Consistent visual appearance across all application screens
- Reduced bundle size (target: 15% reduction)
- Improved developer velocity when creating new UI components
- Full test coverage for core UI components
- Simplified codebase with removal of redundant styling approaches

## Current Status

Task 1 (Optimize Tailwind Configuration) has been completed:
1. ✅ Updated the tailwind.config.js file to v4.1.3 standards with JIT mode enabled
2. ✅ Configured content paths to include all relevant source files
3. ✅ Set up design tokens for colors, spacing, typography, and other UI elements
4. ✅ Added comprehensive design token documentation in docs/design-tokens.md

## Next Steps

We are now proceeding with Task 2 (Convert Layout Components to Tailwind), which involves:

1. Identifying all shared layout components currently using Material UI or Ant Design
2. Implementing Tailwind CSS versions of these layout components
3. Ensuring dark mode support and consistent styling

Following this, we will work on building the reusable component library (Task 3), which will provide the foundation for converting the core UI elements. 