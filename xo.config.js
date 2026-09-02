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
      'jsdoc/check-values': ['error', {allowedLicenses: ['MIT https://github.com/joeda1/svgforge/blob/main/LICENSE']}],
    },
  },
  {
    name: 'svgforge/test-overrides',
    files: ['test/**'],
    rules: {
      'jsdoc/require-returns': 'off',
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
      '**/*.mustache',
      '**/coverage/**',
      '**/docs/**',
      '**/tmpl/**',
      '**/test/tmpl/**',
      '**/test/fixture/**',
    ],
  },
];

export default xoConfig;
