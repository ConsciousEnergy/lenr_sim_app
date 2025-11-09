import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import pluginReactHooks from "eslint-plugin-react-hooks";
import tailwindcssPlugin from "eslint-plugin-tailwindcss";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier"; // Used to disable ESLint rules that conflict with Prettier

export default tseslint.config(
  // Globally recommended rules
  pluginJs.configs.recommended,
  // TypeScript recommended rules
  ...tseslint.configs.recommended,
  // React recommended rules
  {
    ...pluginReactConfig,
    settings: {
      react: {
        version: "18.2", // Specify React version
      },
    },
    rules: {
      ...pluginReactConfig.rules,
      'react/jsx-uses-react': 'off', // Not needed with new JSX transform
      'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
      'react/prop-types': 'off', // Disable prop-types as we use TypeScript
    }
  },
  // React Hooks rules
  {
    plugins: { 'react-hooks': pluginReactHooks },
    rules: pluginReactHooks.configs.recommended.rules
  },
  // TailwindCSS recommended rules
  {
    plugins: { tailwindcss: tailwindcssPlugin },
    rules: {
        ...tailwindcssPlugin.configs.recommended.rules,
        'tailwindcss/no-custom-classname': 'off', // Allow custom class names if needed
    }
  },
  // Prettier integration (disable conflicting rules and enable plugin)
  prettierConfig, // Disables rules that conflict with Prettier
  {
    plugins: { prettier: prettierPlugin },
    rules: {
      'prettier/prettier': 'warn', // Show prettier errors as warnings
    }
  },
  // Global settings for all files
  {
    languageOptions: {
      globals: globals.browser, // Use browser globals
      parserOptions: {
        ecmaFeatures: { jsx: true }, // Enable JSX parsing
      },
    },
    ignores: ["dist", "eslint.config.js"], // Ignore build output and this config file
  },
  // Overrides for specific file types (optional, if needed)
  // {
  //   files: ['**/*.test.ts', '**/*.test.tsx'],
  //   rules: {
  //     // Test specific rules
  //   }
  // }
); 