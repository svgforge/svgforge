const overrides = new Map();

/**
 Named dependency keys.

 Every injectable dependency is addressed through this map so a call site can
 never drift from the key a test registers. Internal seams use
 `namespace:kebab-case`; third-party modules use their package name.

 @type {object}
 */
export const dependencyKeys = {
  csso: 'csso',
  fixXmlString: 'shape:fix-xml-string',
  layoutModes: 'layouter:layout-modes',
  queueShape: 'queue:shape',
  resvg: '@resvg/resvg-js',
  svgoOptimize: 'svgo:optimize',
  svgoPoolOptimize: 'svgo:pool:optimize',
  svgDimensions: 'shape:dimensions',
  templateRender: 'template:render',
  yamlLoad: 'js-yaml:load',
};

/**
 Register a test override for a named dependency

 @param {string} name Dependency identifier to override
 @param {unknown} value Replacement value
 */
export function setDependency(name, value) {
  overrides.set(name, value);
}

/**
 Clear all registered overrides
 */
export function resetDependencies() {
  overrides.clear();
}

/**
 Resolve an optionally-overridden dependency

 @param {string} name Dependency identifier to resolve
 @param {unknown} fallback Real module/function
 @returns {unknown} Override or fallback
 */
export function getDependency(name, fallback) {
  return overrides.has(name) ? overrides.get(name) : fallback;
}
