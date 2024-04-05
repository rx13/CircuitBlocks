module.exports = {
  root: true,
  extends: [],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'off',
    'react/jsx-filename-extension': 0,
    allowTemplateLiterals: 0,
    consistentReturn: 'off',
    'no-console': 0,
    'lines-between-class-members': 0,
    'prefer-template': 0
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  }
};
