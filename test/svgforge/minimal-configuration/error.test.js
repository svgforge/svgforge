
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
      await spriter.compile();
    }, TestError);
  });

  it('should throw a clear error when callback form is used', () => {
    assert.throws(
      () => spriter.compile(() => {}),
      error => {
        assert.strictEqual(error.name, 'ArgumentError');
        assert.match(error.message, /callback arguments are no longer supported/u);
        return true;
      },
    );
  });
});
