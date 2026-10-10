import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'supabase/functions/**'] },
  js.configs.recommended,
  { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tsParser }, plugins: { 'react-hooks': reactHooks, '@typescript-eslint': tsPlugin }, rules: { ...reactHooks.configs.recommended.rules, '@typescript-eslint/no-unused-vars': 'error' } }
];
