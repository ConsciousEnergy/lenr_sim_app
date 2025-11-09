# Tailwind CSS Migration & Optimization

This document outlines the migration from Material UI/Ant Design to Tailwind CSS and the optimization steps taken to reduce bundle size.

## Migration Overview

The LENR Simulation App has been migrated from a mixed Material UI/Ant Design approach to using Tailwind CSS for styling. This provides several benefits:

- Reduced bundle size
- More consistent styling
- Improved developer experience
- Better mobile responsiveness
- Simplified theming

## Key Changes

1. **Removed Dependencies**:
   - Material UI (@mui/material, @mui/icons-material)
   - Emotion (@emotion/react, @emotion/styled)
   - Other styling utilities (classnames, clsx)

2. **New Dependencies**:
   - Tailwind CSS v4.1.3
   - PostCSS and related plugins
   - cssnano for CSS optimization

3. **File Structure Changes**:
   - Removed CSS files in favor of Tailwind utility classes
   - Simplified index.css to only include Tailwind imports
   - Created unified UI component library with Tailwind styling

4. **Bundle Optimization**:
   - Streamlined Tailwind configuration
   - Added content path for proper purging
   - Configured cssnano for production builds
   - Removed redundant CSS and style imports

## Responsive Design Implementation

The application now uses Tailwind's responsive utilities to ensure proper rendering across all device sizes:

- Mobile-first approach with `sm:`, `md:`, `lg:` breakpoints
- Responsive layout components (AppLayout, AppHeader, etc.)
- Touch-optimized controls for mobile devices
- Properly sized fonts and spacing for all screen sizes

## Bundle Size Improvements

| Metric            | Before Migration | After Migration | Improvement |
|-------------------|------------------|-----------------|-------------|
| Total Bundle Size | ~X MB            | ~Y MB           | ~Z% smaller |
| CSS Size          | ~X KB            | ~Y KB           | ~Z% smaller |
| Initial Load Time | ~X ms            | ~Y ms           | ~Z% faster  |

## Usage Guidelines

### Component Classes

Use the following pattern for adding classes to components:

```jsx
<div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
  <h2 className="text-lg font-medium text-neutral-900 dark:text-white">Title</h2>
  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Content</p>
</div>
```

### Responsive Design

Use Tailwind's responsive prefixes to handle different screen sizes:

```jsx
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2">Sidebar</div>
  <div className="w-full md:w-1/2">Content</div>
</div>
```

### Dark Mode

The application supports dark mode with the `dark:` prefix:

```jsx
<button className="bg-white text-black dark:bg-gray-800 dark:text-white">
  Toggle
</button>
```

## Maintenance

### Adding New Components

When adding new components:

1. Use Tailwind utility classes for styling
2. Follow the mobile-first approach
3. Implement dark mode support
4. Test on various screen sizes

### Tailwind Configuration

The Tailwind configuration is in `tailwind.config.js`. To add custom colors or extend the configuration:

```js
// tailwind.config.js
module.exports = {
  // ... existing config
  theme: {
    extend: {
      colors: {
        'custom-color': '#abcdef',
      },
    },
  },
}
```

## Testing for Unused Imports

Run the check-unused-imports script to find any remaining Material UI or unused CSS imports:

```bash
node scripts/check-unused-imports.js
``` 