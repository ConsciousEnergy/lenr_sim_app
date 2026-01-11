# LENR Simulation App - Tailwind CSS Developer Guide

This comprehensive guide provides all the information you need to work with our Tailwind CSS implementation and migrate existing components from Material UI and Ant Design to our custom Tailwind components.

## Table of Contents

1. [Tailwind Configuration](#tailwind-configuration)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing and Layout](#spacing-and-layout)
5. [Component Library](#component-library)
6. [Migration Process](#migration-process)
7. [Examples](#examples)
8. [Dark Mode Support](#dark-mode-support)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Tailwind Configuration

Our Tailwind configuration is set up in `frontend/tailwind.config.js` and includes:

- **JIT Mode**: We use Just-In-Time mode for faster builds and smaller CSS output
- **Dark Mode**: Enabled using the 'class' strategy
- **Content Paths**: All JavaScript and TypeScript files in the src directory are scanned
- **Extended Theme**: Custom colors, spacing, shadows, and more

```js
// Key parts of our tailwind.config.js
export default {
  mode: 'jit',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Additional directories...
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Custom theme extensions...
    }
  },
  plugins: [],
}
```

## Color System

We use a consistent color system with the following palettes:

- **Primary**: Blue-based colors for primary actions and brand elements
- **Secondary**: Purple-based colors for secondary actions and accents
- **Neutral**: Grayscale colors for backgrounds, text, and borders
- **Status Colors**: Success (green), Warning (yellow), Error (red)

Each color has a range from 50 (lightest) to 950 (darkest), with key usage as follows:

```jsx
// Primary button example
<button className="bg-primary-600 hover:bg-primary-700 text-white">
  Click Me
</button>

// Success message example
<div className="bg-success-100 text-success-800 border border-success-200">
  Operation completed successfully!
</div>
```

### Color Usage Guidelines

| Context | Light Mode | Dark Mode |
|---------|------------|-----------|
| Primary Action | primary-600 | primary-500 |
| Secondary Action | secondary-600 | secondary-500 |
| Text (Primary) | neutral-900 | white |
| Text (Secondary) | neutral-700 | neutral-300 |
| Background | white/neutral-50 | neutral-900 |
| Borders | neutral-200 | neutral-700 |
| Success | success-600 | success-500 |
| Warning | warning-500 | warning-400 |
| Error | error-600 | error-500 |

## Typography

Our typography system is built on the Inter font family for sans-serif text and JetBrains Mono for monospace text.

### Font Sizes

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| text-xs | 0.75rem | 1rem | Small labels, captions |
| text-sm | 0.875rem | 1.25rem | Secondary text, form inputs |
| text-base | 1rem | 1.5rem | Body text, default size |
| text-lg | 1.125rem | 1.75rem | Large body text |
| text-xl | 1.25rem | 1.75rem | Subheadings |
| text-2xl | 1.5rem | 2rem | Headings |

### Font Weights

- **font-normal**: Regular text (400)
- **font-medium**: Medium weight (500)
- **font-semibold**: Semi-bold weight (600)
- **font-bold**: Bold weight (700)

### Typography Examples

```jsx
// Heading
<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
  Dashboard
</h1>

// Body text
<p className="text-base text-gray-700 dark:text-gray-300">
  This is regular body text.
</p>

// Small text
<span className="text-sm text-gray-500 dark:text-gray-400">
  Last updated: 3 hours ago
</span>
```

## Spacing and Layout

We follow an 8-point grid system for spacing (with some 4-point values for fine adjustments):

- 0.25rem (4px): p-1, m-1
- 0.5rem (8px): p-2, m-2
- 1rem (16px): p-4, m-4
- 1.5rem (24px): p-6, m-6
- 2rem (32px): p-8, m-8

### Layout Components

Instead of using Material UI's `Grid` or Ant Design's `Row`/`Col`, use Tailwind's grid and flex utilities:

```jsx
// Grid layout (replaces Grid, Row/Col)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Grid items */}
</div>

// Flexbox layout
<div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
  {/* Flex items */}
</div>
```

### Container and Responsive Classes

- **max-w-7xl**: Maximum width for page containers (1280px)
- **mx-auto**: Center horizontally
- **px-4 sm:px-6 lg:px-8**: Responsive padding

### Responsive Breakpoints

| Breakpoint | Size | Usage |
|------------|------|-------|
| sm | 640px | Small devices (landscape phones) |
| md | 768px | Medium devices (tablets) |
| lg | 1024px | Large devices (desktops) |
| xl | 1280px | Extra large devices (large desktops) |
| 2xl | 1536px | 2X large devices |

Use with responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

## Component Library

We've built a set of custom Tailwind components to replace Material UI and Ant Design:

### Available Components

| Component | Description | Usage |
|-----------|-------------|-------|
| Button | Action buttons with various variants | `<Button variant="primary">Click Me</Button>` |
| Card | Content container with header/footer | `<Card title="Title">Content</Card>` |
| Input | Text input field with variants | `<Input label="Name" />` |
| Badge | Status indicators and tags | `<Badge variant="success">Completed</Badge>` |
| Toggle | Switch for boolean values | `<Toggle checked={value} onChange={handleChange} />` |
| Table | Data table with sorting and pagination | `<Table columns={cols} dataSource={data} />` |
| Statistic | Displaying important numbers | `<Statistic title="Users" value={1024} />` |
| Alert | Informational and status messages | `<Alert variant="info">New update available</Alert>` |

### Importing Components

All components are exported from the UI component index:

```jsx
import { Button, Card, Input, Badge, Toggle, Table, Statistic, Alert } from '../components/ui';
```

## Migration Process

Follow these steps to migrate from Material UI/Ant Design to Tailwind:

### 1. Identify Components to Migrate

Look for imports from:
- `@mui/material` or `@material-ui/core`
- `antd` or `@ant-design/icons`

### 2. Replace with Tailwind Components

| Original | Replacement |
|----------|-------------|
| Ant Design Button | `<Button variant="primary">` |
| Material UI Button | `<Button variant="primary">` |
| Ant Design Table | `<Table columns={} dataSource={} />` |
| Material UI TextField | `<Input label="" />` |

### 3. Convert Inline Styles and Props

| Original | Tailwind Alternative |
|----------|---------------------|
| `style={{ marginTop: '1rem' }}` | `className="mt-4"` |
| `sx={{ display: 'flex' }}` | `className="flex"` |
| `gutter={[16, 16]}` | `className="gap-4"` |

### 4. Combine Multiple Classes

Use template literals to combine dynamic classes:

```jsx
// Bad
<div style={{ display: isVisible ? 'block' : 'none' }}>

// Good
<div className={`${isVisible ? 'block' : 'hidden'} p-4 bg-white rounded-lg`}>
```

### 5. Test for Responsiveness

Ensure layouts work on all screen sizes:

```jsx
<div className="flex flex-col md:flex-row">
  <div className="w-full md:w-1/3">Sidebar</div>
  <div className="w-full md:w-2/3">Content</div>
</div>
```

## Examples

### Converting a Card Component

**Before (Ant Design):**
```jsx
import { Card } from 'antd';

<Card title="User Profile" bordered={true} style={{ width: 300 }}>
  <p>Name: John Doe</p>
  <p>Email: john@example.com</p>
</Card>
```

**After (Tailwind):**
```jsx
import { Card } from '../components/ui';

<Card title="User Profile" className="w-[300px]">
  <p className="mb-2">Name: John Doe</p>
  <p>Email: john@example.com</p>
</Card>
```

### Converting a Button Group

**Before (Material UI):**
```jsx
import { Button, ButtonGroup } from '@mui/material';

<ButtonGroup variant="contained">
  <Button>Left</Button>
  <Button>Center</Button>
  <Button>Right</Button>
</ButtonGroup>
```

**After (Tailwind):**
```jsx
import { Button } from '../components/ui';

<div className="inline-flex rounded-md shadow-sm">
  <Button variant="primary" className="rounded-r-none">Left</Button>
  <Button variant="primary" className="rounded-none border-l border-r border-primary-700">Center</Button>
  <Button variant="primary" className="rounded-l-none">Right</Button>
</div>
```

### Converting a Grid Layout

**Before (Ant Design):**
```jsx
import { Row, Col } from 'antd';

<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} md={8} lg={6}>Item 1</Col>
  <Col xs={24} sm={12} md={8} lg={6}>Item 2</Col>
  <Col xs={24} sm={12} md={8} lg={6}>Item 3</Col>
  <Col xs={24} sm={12} md={8} lg={6}>Item 4</Col>
</Row>
```

**After (Tailwind):**
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
</div>
```

## Dark Mode Support

All our components support dark mode out of the box. To add dark mode support to your custom components:

1. Use `dark:` prefix for dark mode variants
2. Toggle dark mode by adding/removing the `dark` class on the `<html>` element

```jsx
// Dark mode toggle example
const toggleDarkMode = () => {
  document.documentElement.classList.toggle('dark');
}

// Dark mode aware component
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  This text adapts to dark mode
</div>
```

## Best Practices

### Do

- ✅ Use utility classes directly instead of creating custom CSS
- ✅ Use consistent spacing based on the 8-point grid
- ✅ Create responsive designs using breakpoint prefixes
- ✅ Group related utilities with semantic class names
- ✅ Include dark mode variants for custom components

### Don't

- ❌ Mix inline styles with Tailwind
- ❌ Use arbitrary values that don't match the design system
- ❌ Duplicate Tailwind utilities with custom CSS
- ❌ Use Material UI/Ant Design components alongside Tailwind components
- ❌ Forget to add dark mode support to new components

### Debugging Tips

- Use browser dev tools to inspect Tailwind classes
- Check for conflicting classes
- Verify responsive breakpoints by resizing the browser
- Test dark mode by toggling the `dark` class

## Troubleshooting

### Common Issues

**Problem**: Classes not being applied
**Solution**: Check that the file is included in the `content` paths in `tailwind.config.js`

**Problem**: Dark mode not working
**Solution**: Ensure the `darkMode` setting is set to `'class'` and the `dark` class is properly toggled

**Problem**: Responsive designs look incorrect
**Solution**: Check that you're using the correct breakpoint prefixes and that media queries are working

### Getting Help

If you encounter issues:

1. Check the [Tailwind CSS documentation](https://tailwindcss.com/docs)
2. Review our custom components in `frontend/src/components/ui`
3. Look at existing converted components for examples
4. Ask for help in the #frontend-dev channel

---

This guide, along with our component library, should give you everything you need to successfully migrate from Material UI and Ant Design to Tailwind CSS. For detailed component documentation, see our [Component Showcase](http://localhost:3000/component-showcase). 