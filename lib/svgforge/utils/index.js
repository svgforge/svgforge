/**
 Checks if value is a callable function.

 @param {unknown} value The value to check.
 @returns {boolean} Returns true if value is correctly classified, else false.
 */
function isFunction(value) {
  return Boolean(value && typeof value === 'function');
}

/**
 Checks if value is the language type of Object (e.g. objects, regexes, new Number(0),
 and new String('')). Excluding arrays (new Array())

 @param {unknown} value The value to check.
 @returns {boolean} Returns true if value is an object, else false.
 */
function isObject(value) {
  return typeof value === 'object' && value !== null;
}

/**
 Checks if value is an Object

 @param {unknown} value The value to check.
 @returns {boolean} Returns true if value is an plain object, else false.
 */
function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 Checks if value is a String

 @param {unknown} value The value to check.
 @returns {boolean} Returns true if value is a String, else false.
 */
function isString(value) {
  return Object.prototype.toString.call(value) === '[object String]';
}

/**
 Trim the start of a string of the specified characters.

 @param {string} inputString The string to trim the start of.
 @param {string} [charsToTrim] The characters to trim from the start of the string. Defaults to a single space. The order of the characters does not matter.
 @returns {string} The trimmed string.
 */
function trimStart(inputString, charsToTrim = ' ') {
  if (!inputString) {
    return '';
  }

  const firstNonTrimCharIndex = [...inputString].findIndex(char => !charsToTrim.includes(char));
  return firstNonTrimCharIndex === -1 ? '' : inputString.slice(firstNonTrimCharIndex);
}

/**
 Combine two arrays into a key-value object

 @param {Array} array1 First array
 @param {Array} array2 Second array
 @returns {object} The zipped Object
 */
function zipObject(array1, array2) {
  if (!Array.isArray(array1) || !Array.isArray(array2)) {
    throw new TypeError('Both parameters must be an array');
  }

  return Object.fromEntries(array1.map((_, i) => ([array1[i], array2[i]])));
}

/**
 Escape a string for use in HTML or XML markup, replacing the five
 reserved characters `&`, `<`, `>`, `"` and `'` with their entities.
 Fastest for short strings: a single literal `replaceAll` pass per character.

 @param {unknown} value The value to escape
 @returns {string} The escaped string
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');
}

/**
 Process an entry and merge it into the destination, skipping
 dangerous prototype-pollution keys (`__proto__`, `constructor`, `prototype`)
 so untrusted configuration cannot tamper with globals.

 @param {object} destination The object to merge into
 @param {string} key Property key
 @param {unknown} value Property value
 @returns {void}
 */
const mergeEntry = (destination, key, value) => {
  if (['__proto__', 'constructor', 'prototype'].includes(key)) {
    return;
  }

  const destinationValue = destination[key];

  if (isPlainObject(value)) {
    destination[key] = deepMerge(isPlainObject(destinationValue) ? destinationValue : {}, value);
  } else {
    destination[key] = Array.isArray(value) ? [...value] : value;
  }
};

/**
 Deep-merge plain objects into a destination object (like `lodash.merge`),
 replacing arrays and cloning nested objects so the sources stay untouched.

 @param {object} destination The object to merge into
 @param {...object} sources Objects whose own enumerable properties are merged
 @returns {object} The merged destination object
 */
function deepMerge(destination, ...sources) {
  for (const source of sources) {
    if (!isPlainObject(source)) {
      continue;
    }

    for (const [key, value] of Object.entries(source)) {
      mergeEntry(destination, key, value);
    }
  }

  return destination;
}

/**
 Run an array of tasks sequentially. Supports async tasks and callback-style
 tasks `(cb)` for compatibility.

 @param {Array<(callback?: (error: Error | null) => void) => unknown>} tasks Tasks to run
 @param {(error: Error|null) => void} [done] Optional completion callback
 @returns {Promise<void>} Resolves when all tasks complete
 */
async function runWaterfall(tasks, done) {
  try {
    for (const task of tasks) {
      // eslint-disable-next-line no-await-in-loop -- Tasks must run sequentially.
      await (task.length > 0
        ? new Promise((resolve, reject) => {
          task(error => (error ? reject(error) : resolve()));
        })
        : task());
    }

    if (done) {
      done(null);
    }
  } catch (error) {
    if (done) {
      done(error);
      return;
    }

    throw error;
  }
}

/**
 Run an array of tasks in parallel, limiting the number of simultaneously
 executing tasks. Supports async tasks and callback-style tasks `(cb)`.

 @param {Array<(callback?: (error: Error | null, ...results: unknown[]) => void) => unknown>} tasks Tasks to run
 @param {number} limit Maximum number of simultaneously running tasks
 @param {(error: Error|null, results?: Array<unknown>) => void} [done] Optional completion callback
 @returns {Promise<Array<unknown>|undefined>} Task results when no callback is provided
 */
async function runParallelLimit(tasks, limit, done) {
  const results = Array.from({length: tasks.length});
  let nextTaskIndex = 0;
  let hasFailed = false;
  let firstError;

  const worker = async () => {
    while (!hasFailed && nextTaskIndex < tasks.length) {
      const taskIndex = nextTaskIndex++;
      const task = tasks[taskIndex];

      try {
        // eslint-disable-next-line no-await-in-loop -- Tasks are fetched one-by-one by the worker.
        results[taskIndex] = await (task.length > 0
          ? new Promise((resolve, reject) => {
            task((error, ...taskResults) => {
              if (error) {
                reject(error);
              } else {
                resolve(taskResults.length > 1 ? taskResults : taskResults[0]);
              }
            });
          })
          : task());
      } catch (error) {
        if (!hasFailed) {
          hasFailed = true;
          firstError = error;
        }

        return;
      }
    }
  };

  const workerCount = Math.min(limit, tasks.length);
  await Promise.all(Array.from({length: workerCount}, () => worker()));

  if (hasFailed) {
    if (done) {
      done(firstError);
      return;
    }

    throw firstError;
  }

  if (done) {
    done(null, results);
    return;
  }

  return results;
}

export {
  isFunction,
  isObject,
  isPlainObject,
  isString,
  trimStart,
  zipObject,
  deepMerge,
  escapeHtml,
  runWaterfall,
  runParallelLimit,
};

export {isResvgAvailable} from './calculate-svg-dimensions.js';
