
import assert from 'node:assert/strict';
import {
  beforeEach,
  describe,
  it,
} from 'node:test';
import SVGSpriter from '../../../lib/index.js';

class TestError extends Error {}

describe('svg-sprite: errors', () => {
  let spriter;

  beforeEach(t => {
    spriter = new SVGSpriter({
      shape: {
        dest: 'svg',
      },
      mode: {
        symbol: true,
      },
    });
    t.mock.method(spriter, '_layout').mock.mockImplementation(async () => {
      throw new TestError();
    });
  });

  it('should throw error if compilation has failed in async mode', async t => {
    await assert.rejects(async () => {
      await spriter.compileAsync();
    }, TestError);
  });

  it('should throw error if compilation has failed in callback mode', async t => {
    await new Promise(resolve => {
      spriter.compile(error => {
        assert.ok(error instanceof TestError);

        resolve();
      });
    });
  });
});
