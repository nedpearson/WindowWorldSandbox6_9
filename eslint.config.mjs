import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  eslint.configs.recommended,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.system_generated/**', '**/playwright-report/**', '**/test-results/**', '**/scripts/**', '**/*.cjs', '**/*.mjs'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
    },
    rules: {
      // Basic rules to catch obvious errors without breaking existing code
      'no-unused-vars': 'off', // Covered by TS
      '@typescript-eslint/no-unused-vars': 'warn', // Too many existing warnings/errors
      'no-undef': 'off', // Covered by TS
      'no-console': 'off',
      'no-empty': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'preserve-caught-error': 'off',
      'no-useless-assignment': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
];
