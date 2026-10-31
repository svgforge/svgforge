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
      // `_` marks members that a base class dispatches on (e.g. `_layout` in
      // mode/base.js, `_init` in the mode classes) or that another module calls.
      // Private `#` members cannot be overridden or called from a subclass, so
      // this rule cannot be satisfied without breaking the mode class hierarchy.
      // Convention: `#` is truly private, `_` is protected.
      'unicorn/prefer-private-class-fields': 'off',
      'jsdoc/no-undefined-types': ['error', {definedTypes: ['SVGSpriter', 'File', 'SVGShape', 'SVGSprite', 'playwright', 'HTMLElement', 'Document', 'Element']}],
      'jsdoc/check-values': ['error', {allowedLicenses: ['MIT https://github.com/svgforge/svgforge/blob/main/LICENSE']}],
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
