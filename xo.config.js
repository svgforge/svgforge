const xoConfig = [
  {
    name: 'svgforge/options',
    space: true,
  },
  {
    name: 'svgforge/rules',
    files: ['**/*.{js,cjs,mjs}'],
    rules: {
      // Project-specific jsdoc additions on top of xo defaults.
      'require-unicode-regexp': ['error', {requireFlag: 'u'}],
      'unicorn/max-nested-calls': ['error', {max: 6}],
      'jsdoc/no-undefined-types': ['error', {definedTypes: ['SVGSpriter', 'File', 'SVGShape', 'SVGSprite', 'playwright', 'HTMLElement', 'Document', 'Element']}],
      'jsdoc/check-values': ['error', {allowedLicenses: ['MIT https://github.com/svgforge/svgforge/blob/main/LICENSE']}],
    },
  },
  {
    name: 'svgforge/test-overrides',
    files: ['test/**', 'test/helpers/**'],
    rules: {
      'jsdoc/require-returns': 'off',
      'node-test/no-import-test-files': 'off',
      'node-test/prefer-mock-call-count': 'off',
      'unicorn/prefer-early-return': 'off',
      'unicorn/prefer-ternary': 'off',
      'unicorn/prefer-combined-guards': 'off',
    },
  },
  {
    name: 'svgforge/lib-overrides',
    files: ['lib/**'],
    rules: {
      'unicorn/prefer-early-return': 'off',
      'unicorn/prefer-ternary': 'off',
      'unicorn/prefer-continue': 'off',
      'unicorn/prefer-simple-condition-first': 'off',
      'unicorn/no-immediate-mutation': 'off',
    },
  },
  {
    name: 'svgforge/ignore-non-code',
    ignores: [
      '**/*.md',
      '**/*.json',
      '**/*.html',
      '**/*.svg',
      '**/*.yaml',
      '**/*.yml',
      '**/*.css',
      '**/coverage/**',
      '**/docs/**',
      '**/tmpl/**',
      '**/test/tmpl/**',
      '**/test/fixture/**',
    ],
  },
];

export default xoConfig;
