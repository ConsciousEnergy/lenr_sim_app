# LENR Simulation App - Design Tokens Documentation

This document outlines the design tokens available in our Tailwind CSS configuration. These tokens form the foundation of our design system and should be used consistently throughout the application.

## Color System

### Primary Colors

Primary colors are used for main UI elements, buttons, links, and primary actions.

```css
primary-50: #f0f9ff
primary-100: #e0f2fe
primary-200: #bae6fd
primary-300: #7dd3fc
primary-400: #38bdf8
primary-500: #0ea5e9 (Base primary color)
primary-600: #0284c7
primary-700: #0369a1
primary-800: #075985
primary-900: #0c4a6e
primary-950: #082f49
```

Usage example:
```html
<button class="bg-primary-600 hover:bg-primary-700 text-white">
  Primary Button
</button>
```

### Secondary Colors

Secondary colors are used for highlighting secondary actions, accents, and complementary UI elements.

```css
secondary-50: #f5f3ff
secondary-100: #ede9fe
secondary-200: #ddd6fe
secondary-300: #c4b5fd
secondary-400: #a78bfa
secondary-500: #8b5cf6 (Base secondary color)
secondary-600: #7c3aed
secondary-700: #6d28d9
secondary-800: #5b21b6
secondary-900: #4c1d95
secondary-950: #2e1065
```

Usage example:
```html
<button class="bg-secondary-500 hover:bg-secondary-600 text-white">
  Secondary Button
</button>
```

### Neutral Colors

Neutral colors are used for text, backgrounds, dividers, and other UI elements that require a more subtle appearance.

```css
neutral-50: #f9fafb
neutral-100: #f3f4f6
neutral-200: #e5e7eb
neutral-300: #d1d5db
neutral-400: #9ca3af
neutral-500: #6b7280 (Base neutral color)
neutral-600: #4b5563
neutral-700: #374151
neutral-800: #1f2937
neutral-900: #111827
neutral-950: #030712
```

Usage example:
```html
<div class="bg-neutral-100 text-neutral-800">
  Card content
</div>
```

### Status Colors

Status colors are used to communicate feedback, states, and outcomes to users.

#### Success

```css
success-50: #f0fdf4
success-100: #dcfce7
success-200: #bbf7d0
success-300: #86efac
success-400: #4ade80
success-500: #22c55e (Base success color)
success-600: #16a34a
success-700: #15803d
success-800: #166534
success-900: #14532d
success-950: #052e16
```

#### Warning

```css
warning-50: #fffbeb
warning-100: #fef3c7
warning-200: #fde68a
warning-300: #fcd34d
warning-400: #fbbf24
warning-500: #f59e0b (Base warning color)
warning-600: #d97706
warning-700: #b45309
warning-800: #92400e
warning-900: #78350f
warning-950: #451a03
```

#### Error

```css
error-50: #fef2f2
error-100: #fee2e2
error-200: #fecaca
error-300: #fca5a5
error-400: #f87171
error-500: #ef4444 (Base error color)
error-600: #dc2626
error-700: #b91c1c
error-800: #991b1b
error-900: #7f1d1d
error-950: #450a0a
```

## Typography

### Font Families

```css
font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif
font-mono: JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace
```

Usage example:
```html
<p class="font-sans">Regular text</p>
<code class="font-mono">Monospaced text</code>
```

### Font Sizes

```css
text-xs: 0.75rem (12px) with line height 1rem (16px)
text-sm: 0.875rem (14px) with line height 1.25rem (20px)
text-base: 1rem (16px) with line height 1.5rem (24px)
text-lg: 1.125rem (18px) with line height 1.75rem (28px)
text-xl: 1.25rem (20px) with line height 1.75rem (28px)
text-2xl: 1.5rem (24px) with line height 2rem (32px)
text-3xl: 1.875rem (30px) with line height 2.25rem (36px)
text-4xl: 2.25rem (36px) with line height 2.5rem (40px)
text-5xl: 3rem (48px) with line height 1
text-6xl: 3.75rem (60px) with line height 1
```

Usage example:
```html
<h1 class="text-3xl font-bold">Page Title</h1>
<p class="text-base">Regular paragraph text</p>
```

## Spacing

Tailwind's default spacing scale, plus our custom additions:

```css
/* Standard Tailwind spacing */
0: 0px
px: 1px
0.5: 0.125rem (2px)
1: 0.25rem (4px)
1.5: 0.375rem (6px)
2: 0.5rem (8px)
2.5: 0.625rem (10px)
3: 0.75rem (12px)
3.5: 0.875rem (14px)
4: 1rem (16px)
5: 1.25rem (20px)
6: 1.5rem (24px)
7: 1.75rem (28px)
8: 2rem (32px)
9: 2.25rem (36px)
10: 2.5rem (40px)
11: 2.75rem (44px)
12: 3rem (48px)
14: 3.5rem (56px)
16: 4rem (64px)

/* Custom spacing values */
18: 4.5rem (72px)
68: 17rem (272px)
72: 18rem (288px)
84: 21rem (336px)
96: 24rem (384px)
128: 32rem (512px)
```

Usage example:
```html
<div class="p-4 m-6">
  <div class="mt-8 mb-4">Content with spacing</div>
</div>
```

## Shadows

```css
shadow-soft: 0 2px 15px 0 rgba(0, 0, 0, 0.05)
shadow-card: 0 1px 3px 0 rgba(0, 0, 0, 0.09)
shadow-elevated: 0 10px 30px -5px rgba(0, 0, 0, 0.1)
shadow-button: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
```

Usage example:
```html
<div class="shadow-card hover:shadow-elevated transition-shadow">
  Card with hover effect
</div>
```

## Border Radius

```css
/* Standard Tailwind border radius */
rounded-none: 0px
rounded-sm: 0.125rem (2px)
rounded: 0.25rem (4px)
rounded-md: 0.375rem (6px)
rounded-lg: 0.5rem (8px)

/* Custom border radius values */
rounded-xl: 1rem (16px)
rounded-2xl: 1.5rem (24px)
rounded-3xl: 2rem (32px)
```

Usage example:
```html
<button class="rounded-lg">Regular button</button>
<div class="rounded-2xl">Rounded card</div>
```

## Animations

```css
animate-spin-slow: spin 3s linear infinite
animate-pulse-slow: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite
```

Usage example:
```html
<div class="animate-spin-slow">Slow spinning element</div>
```

## Z-Index Scale

```css
z-0: 0
z-10: 10
z-20: 20
z-30: 30
z-40: 40
z-50: 50
z-60: 60
z-70: 70
z-80: 80
z-90: 90
z-100: 100
z-auto: auto
```

Usage example:
```html
<div class="z-10 relative">Element with z-index</div>
```

## Usage Guidelines

1. **Consistency**: Always use these tokens instead of hardcoded values to maintain consistency.
2. **Dark Mode**: For dark mode support, use the `dark:` prefix with appropriate color tokens.
3. **Responsive Design**: Combine these tokens with Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) for responsive designs.
4. **Custom Values**: If you need values not covered by these tokens, discuss with the design team to add them to the design system.

## Examples

### Button Component

```html
<button class="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg shadow-button hover:shadow-elevated transition-all">
  Primary Button
</button>
```

### Card Component

```html
<div class="bg-white dark:bg-neutral-800 rounded-xl shadow-card p-6 hover:shadow-elevated transition-shadow">
  <h3 class="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Card Title</h3>
  <p class="mt-2 text-neutral-600 dark:text-neutral-300">Card content goes here.</p>
</div>
``` 