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
      // `_` marks members that a base class dispatches on (e.g. `_layout` in
      // mode/base.js, `_init` in the mode classes) or that another module calls.
      // Private `#` members cannot be overridden or called from a subclass, so
      // this rule cannot be satisfied without breaking the mode class hierarchy.
      // Convention: `#` is truly private, `_` is protected.
      'unicorn/prefer-private-class-fields': 'error',
      'jsdoc/no-undefined-types': ['error', {definedTypes: ['SVGSpriter', 'File', 'SVGShape', 'SVGSprite', 'playwright', 'HTMLElement', 'Document', 'Element', 'Yargs']}],
      'jsdoc/check-values': ['error', {allowedLicenses: ['MIT https://github.com/svgforge/svgforge/blob/main/LICENSE']}],
    },
  },
  {
    name: 'svgforge/protected-members',
    files: [
      'lib/svgforge/spriter.js',
      'lib/svgforge/shape/shape.js',
      'lib/svgforge/mode/base.js',
      'lib/svgforge/mode/defs.js',
      'lib/svgforge/mode/stack.js',
      'lib/svgforge/mode/standalone.js',
      'lib/svgforge/mode/symbol.js',
      'lib/svgforge/mode/view.js',
      'lib/svgforge/mode/view-layout.js',
    ],
    rules: {
      // These classes use `_` members as protected/overridable or cross-module APIs.
      // Re-enable per file once modes use composition.
      'unicorn/prefer-private-class-fields': 'off',
    },
  },
  {
    name: 'svgforge/tests',
    files: ['test/**/*.js'],
    rules: {
      // Tests still use node:assert directly; migrating to t.assert.* is separate.
      'node-test/prefer-test-context-assert': 'off',
      'no-unused-vars': ['error', {argsIgnorePattern: '^_|^t$', varsIgnorePattern: '^_'}],
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
      '**/test/cli/fixtures/**',
    ],
  },
];

export default xoConfig;
