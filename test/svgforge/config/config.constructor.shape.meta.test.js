
import fs from 'node:fs';
import path from 'node:path';
import {Buffer} from 'node:buffer';
import assert from 'node:assert/strict';
import {
  afterEach,
  describe,
  it,
  mock,
} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import {dependencyKeys, setDependency, resetDependencies} from '../../../lib/deps.js';
import SVGSpriterConfig from '../../../lib/svgforge/config.js';

afterEach(() => {
  mock.restoreAll();
  resetDependencies();
});

// `fs.stat`-like result with mocked predicate methods. Built outside the test
// callbacks to keep the mock nesting shallow.
const statResult = ({isSymbolicLink = false, isFile = false} = {}) => ({
  isSymbolicLink: mock.fn(() => isSymbolicLink),
  isFile: mock.fn(() => isFile),
});

describe('testing SVGSpriterConfig shape.meta', () => {
  it('should copy fields from config.shape', () => {
    const TEST_SHAPE = {TEST_1: 1, TEST_2: 2};
    const config = new SVGSpriterConfig({shape: TEST_SHAPE});

    assert.partialDeepStrictEqual(config.shape, TEST_SHAPE);
  });

  it('should set empty meta if shape is not passed', () => {
    const config = new SVGSpriterConfig({});

    assert.deepStrictEqual(config.shape.meta, {});
  });

  it('should set empty meta if shape.meta is not passed', () => {
    const config = new SVGSpriterConfig({shape: {}});

    assert.deepStrictEqual(config.shape.meta, {});
  });

  it('should set empty meta if plain object is passed', () => {
    const config = new SVGSpriterConfig({shapa: {meta: {TEST: 1}}});

    assert.deepStrictEqual(config.shape.meta, {});
  });

  it('should set empty meta if passed anything but string', () => {
    const config = new SVGSpriterConfig({shape: {meta: true}});

    assert.deepStrictEqual(config.shape.meta, {});
  });

  describe('if string passed', () => {
    it('should check stat if passed path to the file', () => {
      mock.method(fs, 'lstatSync');
      // eslint-disable-next-line no-new
      new SVGSpriterConfig({shape: {meta: '.'}});

      assert.ok(fs.lstatSync.mock.calls.some(call => isDeepStrictEqual(call.arguments, [path.resolve('.')])), 'expected a matching call');
    });

    it('should set empty object if stat is not a file', () => {
      const stat = statResult();
      mock.method(fs, 'lstatSync').mock.mockImplementationOnce(() => stat);

      const config = new SVGSpriterConfig({shape: {meta: '.'}});

      assert.deepStrictEqual(config.shape.meta, {});
    });

    it('should set object read from correct yaml if stat is a file', () => {
      const TEST_FILE_NAME = './TEST_FILE_NAME.svg';
      const TEST_FILE_CONTENTS = Buffer.from('some kind of file');
      const TEST_META = {
        [TEST_FILE_NAME]: {
          title: 'test',
          description: 'test',
        },
      };

      const stat = statResult({isFile: true});
      mock.method(fs, 'lstatSync').mock.mockImplementationOnce(() => stat);
      mock.method(fs, 'readFileSync').mock.mockImplementationOnce(() => (TEST_FILE_CONTENTS));
      const yamlLoad = mock.fn(() => (TEST_META));
      setDependency(dependencyKeys.yamlLoad, yamlLoad);

      const config = new SVGSpriterConfig({shape: {meta: '.'}});

      assert.ok(yamlLoad.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_FILE_CONTENTS])), 'expected a matching call');
      assert.deepStrictEqual(config.shape.meta, {
        [path.join(path.dirname(TEST_FILE_NAME), path.basename(TEST_FILE_NAME, '.svg'))]: TEST_META[TEST_FILE_NAME],
      });
    });

    it('should set empty object if data from correct yaml contains non-object values and if stat is a file', () => {
      const TEST_FILE_NAME = './TEST_FILE_NAME.svg';
      const TEST_FILE_CONTENTS = Buffer.from('some kind of file');
      const TEST_META = {
        [TEST_FILE_NAME]: false,
      };

      const stat = statResult({isFile: true});
      mock.method(fs, 'lstatSync').mock.mockImplementationOnce(() => stat);
      mock.method(fs, 'readFileSync').mock.mockImplementationOnce(() => (TEST_FILE_CONTENTS));
      setDependency(dependencyKeys.yamlLoad, mock.fn(() => (TEST_META)));

      const config = new SVGSpriterConfig({shape: {meta: '.'}});

      assert.deepStrictEqual(config.shape.meta, {});
    });

    it('should follow symlink', () => {
      const TEST_DEST = '.';

      mock.method(fs, 'readlinkSync').mock.mockImplementationOnce(() => (TEST_DEST));
      mock.method(fs, 'statSync').mock.mockImplementationOnce(() => statResult());

      mock.method(fs, 'lstatSync').mock.mockImplementationOnce(() => statResult({isSymbolicLink: true}));

      // eslint-disable-next-line no-new
      new SVGSpriterConfig({shape: {meta: '.'}});

      assert.ok(fs.readlinkSync.mock.calls.some(call => isDeepStrictEqual(call.arguments, [path.resolve('.')])), 'expected a matching call');
      assert.ok(fs.statSync.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_DEST])), 'expected a matching call');
    });
  });
});
