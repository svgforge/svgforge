
import path from 'node:path';
import assert from 'node:assert/strict';
import {describe, it, mock} from 'node:test';
import SVGSpriterConfig from '../../../lib/svgforge/config.js';
import {paths} from '../../../test-utils/constants.js';

describe('testing initial attributes', () => {
  it('should set dest from config.dest', () => {
    const config = new SVGSpriterConfig({
      dest: paths.tmp,
    });

    assert.strictEqual(config.dest, path.resolve(paths.tmp));
  });

  it('should set dest as current directory if not provided', () => {
    const config = new SVGSpriterConfig({});

    assert.strictEqual(config.dest, path.resolve('.'));
  });

  it('should set variables accordingly to config.variables', () => {
    const TEST_VARIABLES = {TEST_1: 1, TEST_2: 2};
    const config = new SVGSpriterConfig({variables: TEST_VARIABLES});

    assert.deepStrictEqual(config.variables, TEST_VARIABLES);
    assert.notStrictEqual(config.variables, TEST_VARIABLES);
  });
});

describe('testing sort', () => {
  it('should set sort accordingly to config if function provided', () => {
    const TEST_FN = mock.fn();
    const config = new SVGSpriterConfig({shape: {sort: TEST_FN}});

    assert.strictEqual(config.shape.sort, TEST_FN);
  });

  it('should set default sort if not provided', () => {
    const config = new SVGSpriterConfig({});
    const TEST_SHAPES = [
      {id: 0},
      {id: 0},
      {id: 1},
      {id: 3},
      {id: 2},
    ];

    assert.deepStrictEqual(TEST_SHAPES.toSorted(config.shape.sort), [
      {id: 0},
      {id: 0},
      {id: 1},
      {id: 2},
      {id: 3},
    ]);
  });
});
