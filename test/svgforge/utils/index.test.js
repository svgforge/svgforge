
/* eslint-disable unicorn/new-for-builtins, no-new-wrappers, prefer-regex-literals -- these constructs are under test */

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  isFunction,
  isObject,
  isString,
  isPlainObject,
  trimStart,
  zipObject,
  deepMerge,
  escapeHtml,
  runParallelLimit,
} from '../../../lib/svgforge/utils/index.js';

describe('utils', () => {
  describe('isFunction', () => {
    it('should return true for a class', () => {
      assert.strictEqual(isFunction(class {}), true);
    });

    it('should return true for a function', () => {
      assert.strictEqual(isFunction(() => {}), true);
    });

    it('should return true for an async function', () => {
      assert.strictEqual(isFunction(async () => {}), true);
    });

    it('should return true for generator function', () => {
      assert.strictEqual(isFunction(function * () {}), true);
    });

    it('should return false for a RegExp', () => {
      assert.strictEqual(isFunction(/a/gu), false);
    });

    it('should return false for a null value', () => {
      assert.strictEqual(isFunction(null), false);
    });

    it('should return false for an undefined value', () => {
      assert.strictEqual(isFunction(undefined), false);
    });

    it('should return false for a plain object', () => {
      assert.strictEqual(isFunction({}), false);
    });

    it('should return false for an array', () => {
      assert.strictEqual(isFunction([1, 2, 3]), false);
    });

    it('should return false for a numeric value', () => {
      assert.strictEqual(isFunction(123), false);
    });

    it('should return false for a string', () => {
      assert.strictEqual(isFunction('test'), false);
    });

    it('should return false for a boolean value', () => {
      assert.strictEqual(isFunction(false), false);
    });
  });

  describe('isObject', () => {
    it('should return true for an object', () => {
      assert.strictEqual(isObject({}), true);
    });

    it('should return true for a new String', () => {
      assert.strictEqual(isObject(new String('')), true);
    });

    it('should return true for a new Regexp', () => {
      assert.strictEqual(isObject(new RegExp('', 'u')), true);
    });

    it('should return true for a new Number', () => {
      assert.strictEqual(isObject(new Number(1)), true);
    });

    it('should return true for a new Boolean', () => {
      assert.strictEqual(isObject(new Boolean()), true);
    });

    it('should return true for an array (lodash backport)', () => {
      // Documented behavior: `isObject` returns true for arrays, matching the lodash `isObject` backport.
      assert.strictEqual(isObject([1, 2, 3]), true);
    });

    it('should return false for a Function constructor', () => {
      assert.strictEqual(isObject(Function), false);
    });

    it('should return false for a null value', () => {
      assert.strictEqual(isObject(null), false);
    });

    it('should return false for an undefined value', () => {
      assert.strictEqual(isObject(undefined), false);
    });

    it('should return false for a string value', () => {
      assert.strictEqual(isObject('test'), false);
    });

    it('should return false for a boolean value', () => {
      assert.strictEqual(isObject(false), false);
    });

    it('should return false for a function', () => {
      assert.strictEqual(isObject(() => {}), false);
    });

    it('should return false for a Symbol', () => {
      assert.strictEqual(isObject(Symbol('test')), false);
    });
  });

  describe('isString', () => {
    it('should return true for a string', () => {
      assert.strictEqual(isString('test'), true);
    });

    it('should return false for an array', () => {
      assert.strictEqual(isString([1, 2, 3]), false);
    });

    it('should return false for a Function constructor', () => {
      assert.strictEqual(isString(Function), false);
    });

    it('should return false for a null value', () => {
      assert.strictEqual(isString(null), false);
    });

    it('should return false for an undefined value', () => {
      assert.strictEqual(isString(undefined), false);
    });

    it('should return false for a boolean value', () => {
      assert.strictEqual(isString(false), false);
    });
  });

  describe('isPlainObject', () => {
    it('should return true for an object', () => {
      assert.strictEqual(isPlainObject({a: 1}), true);
    });

    it('should return false for a new String', () => {
      assert.strictEqual(isPlainObject(new String('')), false);
    });

    it('should return false for a new Regexp', () => {
      assert.strictEqual(isPlainObject(new RegExp('', 'u')), false);
    });

    it('should return false for a new Number', () => {
      assert.strictEqual(isPlainObject(new Number(1)), false);
    });

    it('should return false for a new Boolean', () => {
      assert.strictEqual(isPlainObject(new Boolean()), false);
    });

    it('should return false for a new Array', () => {
      assert.strictEqual(isPlainObject(Array.from({length: 1})), false);
    });

    it('should return false for an array', () => {
      assert.strictEqual(isPlainObject([1, 2, 3]), false);
    });

    it('should return false for a Function constructor', () => {
      assert.strictEqual(isPlainObject(Function), false);
    });

    it('should return false for a null value', () => {
      assert.strictEqual(isPlainObject(null), false);
    });

    it('should return false for an undefined value', () => {
      assert.strictEqual(isPlainObject(undefined), false);
    });

    it('should return false for a string value', () => {
      assert.strictEqual(isPlainObject('test'), false);
    });

    it('should return false for a boolean value', () => {
      assert.strictEqual(isPlainObject(false), false);
    });

    it('should return false for a function', () => {
      assert.strictEqual(isPlainObject(() => {}), false);
    });

    it('should return false for a Symbol', () => {
      assert.strictEqual(isPlainObject(Symbol('test')), false);
    });
  });

  describe('trimStart', () => {
    it('should trim the start of a string of space characters', () => {
      assert.strictEqual(trimStart('  abc  '), 'abc  ');
    });

    it('allow specifying a set of characters to trim', () => {
      assert.strictEqual(trimStart('../././../../somefile.txt', '/.'), 'somefile.txt');
    });

    it('coerces undefined inputs to strings', () => {
      assert.strictEqual(trimStart(undefined), '');
    });

    it('coerces null inputs to strings', () => {
      assert.strictEqual(trimStart(null, '*'), '');
    });

    it('handles empty string inputs', () => {
      assert.strictEqual(trimStart('', '_-_'), '');
    });

    it('handles empty string of chars to trim', () => {
      const string = '   a lovely string   ';

      assert.strictEqual(trimStart(string, ''), string);
    });

    it('handles string fully composed of characters to trim', () => {
      assert.strictEqual(trimStart('---', '-'), '');
    });
  });

  describe('zipObject', () => {
    it('should return the zipped object', () => {
      assert.deepStrictEqual(zipObject(['a', 'b'], [1, 2]), {a: 1, b: 2});
    });

    it('should return the zipped object with unbalanced arrays', () => {
      assert.deepStrictEqual(zipObject(['a', 'b', 'c'], [1, 2]), {a: 1, b: 2, c: undefined});
      assert.deepStrictEqual(zipObject(['a'], [1, 2]), {a: 1});
    });

    it('should not fail with empty arrays', () => {
      assert.deepStrictEqual(zipObject([], []), {});
    });

    it('should throw error if non-array value passed', () => {
      assert.throws(() => {
        zipObject(1, false);
      }, new TypeError('Both parameters must be an array'));

      assert.throws(() => {
        zipObject([1], false);
      }, new TypeError('Both parameters must be an array'));
    });
  });

  describe('deepMerge', () => {
    it('should merge multiple source objects into the destination', () => {
      assert.deepStrictEqual(deepMerge({a: 1}, {b: 2}, {c: 3}), {a: 1, b: 2, c: 3});
    });

    it('should overwrite destination properties with later sources', () => {
      assert.deepStrictEqual(deepMerge({a: 1}, {a: 2}), {a: 2});
    });

    it('should merge nested plain objects recursively', () => {
      const result = deepMerge({spacing: {box: 'content'}}, {spacing: {padding: {top: 0}}});

      assert.deepStrictEqual(result, {spacing: {box: 'content', padding: {top: 0}}});
    });

    it('should keep partial nested overrides instead of replacing the object', () => {
      const defaults = {
        padding: {
          top: 0, right: 0, bottom: 0, left: 0,
        },
      };

      assert.deepStrictEqual(deepMerge({}, defaults, {padding: {top: 10}}), {
        padding: {
          top: 10, right: 0, bottom: 0, left: 0,
        },
      });
    });

    it('should replace arrays instead of merging them by index', () => {
      assert.deepStrictEqual(deepMerge({list: ['a']}, {list: ['b', 'c']}), {list: ['b', 'c']});
    });

    it('should leave the source objects untouched', () => {
      const source = {nested: {padding: {top: 0}}};
      const result = deepMerge({}, source);

      result.nested.padding.top = 10;
      assert.deepStrictEqual(source.nested.padding, {top: 0});
    });

    it('should return the (mutated) destination object', () => {
      const destination = {a: 1};

      assert.strictEqual(deepMerge(destination, {b: 2}), destination);
    });

    it('should not pollute the prototype via __proto__/constructor keys', () => {
      const result = deepMerge({}, JSON.parse('{"__proto__": {"polluted": true}}'));

      assert.strictEqual(Object.hasOwn(result, '__proto__'), false);
      assert.strictEqual(Object.getPrototypeOf(result).polluted, undefined);
    });
  });

  describe('escapeHtml', () => {
    it('should escape all five reserved characters', () => {
      assert.strictEqual(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
    });

    it('should return plain text unescaped', () => {
      assert.strictEqual(escapeHtml('simple text'), 'simple text');
    });

    it('should stringify non-string values', () => {
      assert.strictEqual(escapeHtml(42), '42');
      assert.strictEqual(escapeHtml(null), 'null');
      assert.strictEqual(escapeHtml(undefined), 'undefined');
    });
  });

  describe('runParallelLimit', () => {
    it('should stop scheduling tasks and report the first error', async () => {
      const TEST_ERROR = new Error('task failed');
      const executed = [];
      const tasks = [
        callback => {
          setTimeout(() => {
            executed.push(0);
            callback(null, 'first');
          }, 5);
        },
        callback => {
          executed.push(1);
          callback(TEST_ERROR);
        },
        callback => {
          executed.push(2);
          callback(null, 'third');
        },
        callback => {
          executed.push(3);
          callback(null, 'fourth');
        },
      ];

      let doneCalls = 0;
      let doneError;
      await runParallelLimit(tasks, 2, error => {
        doneCalls++;
        doneError = error;
      });

      assert.strictEqual(doneCalls, 1);
      assert.strictEqual(doneError, TEST_ERROR);
      assert.deepStrictEqual(executed.toSorted((a, b) => a - b), [0, 1]);
    });
  });
});
