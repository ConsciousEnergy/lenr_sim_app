// Intentionally empty - rename only

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:tailwindcss/recommended',
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } }, // Specify React version
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'prettier',
    'tailwindcss'
    // Removed 'react-refresh' as it's often Vite specific and handled there
  ],
  rules: {
    'prettier/prettier': 'warn', // Show prettier errors as warnings
    'react/jsx-uses-react': 'off', // Not needed with new JSX transform
    'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
    'react/prop-types': 'off', // Disable prop-types as we use TypeScript
    '@typescript-eslint/no-explicit-any': 'warn', // Warn instead of error for any type
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'tailwindcss/no-custom-classname': 'off', // Allow custom class names if needed
    // Add any project-specific overrides here
  },
}; 