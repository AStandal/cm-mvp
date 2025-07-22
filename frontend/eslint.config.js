import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import vitestGlobals from 'eslint-plugin-vitest-globals';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true
                }
            },
            globals: {
                ...globals.browser,
                ...globals.node,
                ...vitestGlobals.environments.env.globals
            }
        },
        plugins: {
            '@typescript-eslint': typescript,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            'vitest-globals': vitestGlobals
        },
        rules: {
            ...typescript.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-explicit-any': 'off',
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true }
            ]
        }
    },
    {
        ignores: ['dist/**', '*.config.*', '*.test.*', 'node_modules/**']
    }
];