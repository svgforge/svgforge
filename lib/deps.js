const overrides = new Map();

/**
 * Register a test override for a named dependency
 *
 * @param {string} name Dependency name
 * @param {*} value Replacement value
 */
export function setDependency(name, value) {
  overrides.set(name, value);
}

/**
 * Clear all registered overrides
 */
export function resetDependencies() {
  overrides.clear();
}

/**
 * Resolve an optionally-overridden dependency
 *
 * @param {string} name Dependency name
 * @param {*} fallback Real module/function
 * @returns {*} Override or fallback
 */
export function getDependency(name, fallback) {
  return overrides.has(name) ? overrides.get(name) : fallback;
}
