
import assert from 'node:assert/strict';
import {
  beforeEach,
  describe,
  it,
  mock,
} from 'node:test';
import SVGSpriter from '../../../lib/svgforge.js';

class TestError extends Error {}

describe('svg-sprite: errors', () => {
  let spriter;

  beforeEach(() => {
    spriter = new SVGSpriter({
      shape: {
        dest: 'svg',
      },
      mode: {
        symbol: true,
      },
    });
    mock.method(spriter, '_layout').mock.mockImplementation((_, cb) => {
      cb(new TestError(), {}, {});
    });
  });

  it('should throw error if compilation has failed in async mode', async () => {
    await assert.rejects(async () => {
      await spriter.compileAsync();
    }, TestError);
  });

  it('should throw error if compilation has failed in callback mode', async () => {
    await new Promise(resolve => {
      spriter.compile(error => {
        assert.ok(error instanceof TestError);

        resolve();
      });
    });
  });
});
