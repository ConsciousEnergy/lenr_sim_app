# UI Migration Guide: Material UI and Ant Design to Tailwind CSS

This document outlines the components that need to be migrated from Material UI and Ant Design to our custom Tailwind CSS components.

## Core Components to Convert

### Ant Design Components

1. **Layout Components**
   - `Layout` → Tailwind grid/flex classes
   - `Menu` → Custom Tailwind navigation component
   - `Drawer` → Custom sidebar with Tailwind transitions
   - `Row`, `Col` → Tailwind grid system

2. **Data Display**
   - `Table` → Custom Tailwind table
   - `Card` → Our new `Card` component 
   - `Tag` → Our new `Badge` component

3. **Form Elements**
   - `Button` → Our new `Button` component
   - `Input` → Our new `Input` component
   - `Select` → Custom select with Tailwind
   - `Tooltip` → Custom tooltip with Tailwind
   - `Form`, `Form.Item` → Custom form layout

4. **Feedback Components**
   - `Statistic` → Custom statistic component
   - `Progress` → Custom progress bar

5. **Typography**
   - `Typography.Title` → Heading elements with Tailwind classes
   - `Typography.Text` → Text elements with Tailwind classes

### Material UI Components

1. **Layout Components**
   - `Box` → Tailwind utility classes
   - `Container` → Tailwind container classes
   - `Grid` → Tailwind grid system
   - `Stack` → Tailwind flex and gap utilities
   - `Paper` → Our new `Card` component variants
   - `Drawer` → Custom drawer with Tailwind

2. **Data Display**
   - `Typography` → Tailwind text utilities
   - `Divider` → Tailwind border utilities
   - `List` → Custom list with Tailwind

3. **Feedback**
   - `Alert` → Custom alert component
   - `Snackbar` → Custom toast/notification component
   - `CircularProgress` → Custom loading spinner
   - `LinearProgress` → Custom progress bar

4. **Inputs**
   - `Button` → Our new `Button` component
   - `TextField` → Our new `Input` component
   - `Select` → Custom select component
   - `Slider` → Custom slider component
   - `Switch` → Our new `Toggle` component

5. **Navigation**
   - `AppBar` → Custom header with Tailwind
   - `Tabs` → Custom tabs component
   - `Breadcrumbs` → Custom breadcrumbs with Tailwind

6. **Surfaces**
   - `Accordion` → Custom accordion with Tailwind
   - `Card` → Our new `Card` component
   - `Dialog` → Custom dialog/modal component

## Icons
- Material UI Icons → Replace with equivalent icons from a dedicated icon library (e.g., Heroicons, Lucide)
- Ant Design Icons → Replace with equivalent icons from a dedicated icon library

## Migration Strategy

For each component:

1. Identify all instances across the codebase
2. Create a Tailwind-based replacement using our component library
3. Update imports to use our custom components
4. Verify styling and functionality match the original component

## Pages to Convert (Priority Order)

1. Dashboard.jsx
2. NewSimulation.jsx
3. ReactionsPage.jsx
4. Other visualization and simulation components

## Testing Plan

- Visual regression testing for each converted component
- Functional testing to ensure all features still work
- Responsive design verification on multiple screen sizes

## Benefits

- Reduced bundle size
- Consistent styling system
- Easier customization
- Better performance
- Dark mode support

## Reference Implementation

We've created a reference implementation of the Dashboard page using our Tailwind UI components. 
This serves as a blueprint for how to convert existing pages from Material UI and Ant Design to our 
custom Tailwind components.

### Dashboard Conversion

The Dashboard page has been converted from using Ant Design components to our Tailwind-based components:

- Original: `frontend/src/pages/Dashboard.jsx`
- Converted: `frontend/src/pages/DashboardConverted.jsx`

The conversion includes:

- Replaced Ant Design's `Table` with our custom `Table` component
- Replaced Ant Design's `Card` with our custom `Card` component
- Replaced Ant Design's `Tag` with our custom `Badge` component
- Replaced Ant Design's `Button` with our custom `Button` component
- Replaced Ant Design's `Statistic` with our custom `Statistic` component
- Added an `Alert` component to show system updates
- Used Tailwind's grid system instead of Ant Design's `Row` and `Col`
- Replaced Ant Design icons with custom SVG icons
- Added dark mode support throughout the UI

### Conversion Notes

When converting a page:

1. **Start with imports**: Replace Ant Design/Material UI imports with our UI components:
   ```jsx
   import { Button, Table, Card, Badge, Statistic, Alert } from '../components/ui';
   ```

2. **Replace layout components**: Convert Row/Col to Tailwind grid/flex:
   ```jsx
   {/* Before */}
   <Row gutter={[16, 16]}>
     <Col xs={24} sm={12} md={6}>
       <Card>...</Card>
     </Col>
   </Row>

   {/* After */}
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
     <Card>...</Card>
   </div>
   ```

3. **Handle responsive design**: Use Tailwind's responsive modifiers:
   ```jsx
   <div className="flex flex-col md:flex-row md:items-center md:justify-between">
   ```

4. **Replace icons**: Either use an icon library or inline SVGs:
   ```jsx
   const CheckIcon = () => (
     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="..." />
     </svg>
   );
   ```

5. **Update component props**: Map the old component props to new components:
   - Ant Design: `<Button type="primary">`
   - Tailwind: `<Button variant="primary">`

6. **Add dark mode classes**: All components should have dark mode variants:
   ```jsx
   <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
   ```

Through this reference implementation, we've shown how to effectively convert existing UI components to our Tailwind-based system while maintaining functionality and enhancing the user experience with dark mode support. 