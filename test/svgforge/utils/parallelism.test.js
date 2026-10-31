import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {coreCount, shapeConcurrency, svgoWorkerCount} from '../../../lib/svgforge/utils/parallelism.js';

describe('testing coreCount()', () => {
  it('should never report less than one core', () => {
    assert.strictEqual(coreCount(0), 1);
    assert.strictEqual(coreCount(1), 1);
    assert.strictEqual(coreCount(8), 8);
  });
});

describe('testing svgoWorkerCount()', () => {
  it('should leave one core for the main thread', () => {
    assert.strictEqual(svgoWorkerCount(1), 1);
    assert.strictEqual(svgoWorkerCount(2), 1);
    assert.strictEqual(svgoWorkerCount(4), 3);
    assert.strictEqual(svgoWorkerCount(16), 15);
  });
});

describe('testing shapeConcurrency()', () => {
  it('should pin the concurrency to the cores with a floor of four', () => {
    assert.strictEqual(shapeConcurrency(1), 4);
    assert.strictEqual(shapeConcurrency(2), 4);
    assert.strictEqual(shapeConcurrency(4), 4);
    assert.strictEqual(shapeConcurrency(8), 8);
    assert.strictEqual(shapeConcurrency(16), 16);
  });

  it('should never starve the worker pool', () => {
    assert.ok([1, 2, 4, 8, 16, 64].every(cores => shapeConcurrency(cores) >= svgoWorkerCount(cores)));
  });
});
