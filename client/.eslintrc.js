// ...existing code...
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  },
  rules: {
    'no-empty': 'warn',
    'no-undef': 'off',
    'react/jsx-filename-extension': 0,
    'allowTemplateLiterals': 0,
    'consistentReturn': 'off',
    'no-unused-vars': 'off',
    'no-console': 0,
    'lines-between-class-members': 0,
    'prefer-template': 0,
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-var-requires': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    'no-fallthrough': 'warn',
    'react/no-unescaped-entities': 'warn',
    'no-prototype-builtins': 'warn',
    'react/no-deprecated': 'warn',
    'no-case-declarations': 'warn',
    'no-constant-condition': 'warn',
    '@typescript-eslint/no-duplicate-enum-values': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-unused-expressions': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-unused-vars': 'off'
  }
};
