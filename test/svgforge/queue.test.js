
import {EventEmitter} from 'node:events';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  beforeEach,
  describe,
  it,
  mock,
} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import File from 'vinyl';
import SVGSpriterQueue from '../../lib/svgforge/queue.js';
import DimensionsCalculationError from '../../lib/svgforge/errors/dimensions-calculation-error.js';
import {dependencyKeys, setDependency} from '../../lib/deps.js';

/* eslint-disable max-nested-callbacks -- Mock implementations of the queued shape/process callbacks are intentionally nested to model the async event flow under test. */

const mockShape = mock.fn();
setDependency(dependencyKeys.queueShape, mockShape);

describe('testing Queue', () => {
  describe('testing constructor()', () => {
    it('should be instance of EventEmitter', () => {
      const queue = new SVGSpriterQueue({debug: mock.fn()});

      assert.ok(queue instanceof EventEmitter);
    });

    it('should set initial values and debug to console', () => {
      const spriter = {debug: mock.fn()};
      const queue = new SVGSpriterQueue(spriter);

      assert.strictEqual(queue._spriter, spriter);
      assert.deepStrictEqual(queue._files, []);
      assert.strictEqual(queue.active, 0);
      assert.ok(spriter.debug.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['Created processing queue instance'])), 'expected a matching call');
    });

    it('should add events', () => {
      const queue = new SVGSpriterQueue({debug: mock.fn()});

      assert.strictEqual(queue.listenerCount('add'), 1);
      assert.strictEqual(queue.listenerCount('remove'), 1);
    });
  });

  describe('testing add()', () => {
    it('should debug info, add file to _files and emit "add" event', () => {
      const spriter = {debug: mock.fn()};
      const TEST_FILE_NAME = '/base/test.svg';
      const TEST_FILE = new File({
        path: TEST_FILE_NAME,
        base: '/base/',
      });
      const queue = new SVGSpriterQueue(spriter);

      mock.method(queue, 'emit');

      queue.add(TEST_FILE);

      assert.deepStrictEqual(spriter.debug.mock.calls.at(-1).arguments, ['Added "%s" to processing queue', path.basename(TEST_FILE_NAME)]);
      assert.deepStrictEqual(queue._files, [TEST_FILE]);
      assert.ok(queue.emit.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['add'])), 'expected a matching call');
    });
  });

  describe('testing remove()', () => {
    let spriter;
    let queue;

    const TEST_SHAPE = {id: 'test-shape'};

    beforeEach(() => {
      spriter = {
        debug: mock.fn(),
        error: mock.fn(),
        warn: mock.fn(),
        _shapes: [],
      };
      queue = new SVGSpriterQueue(spriter);
    });

    it('should add shape to spriter', () => {
      queue.remove(null, TEST_SHAPE);

      assert.deepStrictEqual(spriter._shapes, [TEST_SHAPE]);
    });

    it('should not add shape to spriter, log the error and announce the skip if processing fails', () => {
      const TEST_ERROR = new Error('test');
      const onSkipped = mock.fn();
      queue.on('shape-skipped', onSkipped);
      queue.remove(TEST_ERROR, TEST_SHAPE);

      assert.deepStrictEqual(spriter._shapes, []);
      assert.ok(spriter.error.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['Skipping "%s" (%s)', TEST_SHAPE.id, TEST_ERROR.message])), 'expected a matching call');
      assert.strictEqual(spriter._errorSkipped, 1);
      assert.ok(onSkipped.mock.calls.some(call => isDeepStrictEqual(call.arguments, [{file: TEST_SHAPE.id, error: TEST_ERROR}])), 'expected a matching call');
    });

    it('should not add shape to spriter, log a warning with the install hint and count the skip if dimension calculation failed', () => {
      const TEST_ERROR = new DimensionsCalculationError('not installed — run `npm install @resvg/resvg-js`');
      const onSkipped = mock.fn();
      queue.on('shape-skipped', onSkipped);
      queue.remove(TEST_ERROR, TEST_SHAPE);

      assert.deepStrictEqual(spriter._shapes, []);
      assert.ok(spriter.warn.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['Skipping "%s" (%s)', TEST_SHAPE.id, TEST_ERROR.message])), 'expected a matching call');
      assert.strictEqual(spriter._dimensionSkipped, 1);
      assert.ok(onSkipped.mock.calls.some(call => isDeepStrictEqual(call.arguments, [{file: TEST_SHAPE.id, error: TEST_ERROR}])), 'expected a matching call');
    });

    it('should emit "remove" if active count is more than 1', () => {
      queue.active = 2;
      mock.method(queue, 'emit');
      queue.remove(null, TEST_SHAPE);

      assert.ok(queue.emit.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['remove'])), 'expected a matching call');
    });

    it('should emit "empty" if active count is 1', () => {
      queue.active = 1;
      mock.method(queue, 'emit');
      queue.remove(null, TEST_SHAPE);

      assert.ok(queue.emit.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['empty'])), 'expected a matching call');
    });

    it('should emit "remove" while another file is still waiting (limit 1)', () => {
      queue.active = 1;
      queue._files = [1];
      mock.method(queue, 'emit');
      queue.remove(null, TEST_SHAPE);

      assert.strictEqual(queue.active, 0);
      assert.ok(queue.emit.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['remove'])), 'expected a matching call');
      assert.ok(queue.emit.mock.calls.every(call => !isDeepStrictEqual(call.arguments, ['empty'])), 'expected no matching call');
    });
  });

  describe('testing process()', () => {
    let spriter;
    let queue;

    beforeEach(() => {
      spriter = {
        debug: mock.fn(),
        _limit: 10,
        error: mock.fn(),
        warn: mock.fn(),
        _transformShape: mock.fn((shape, cb) => cb(null)),
      };
      queue = new SVGSpriterQueue(spriter);
    });

    it('should not do anything if files is empty', () => {
      queue._files = [];
      // eslint-disable-next-line node-test/prefer-mock-method -- `mock.method` rejects arrays.
      queue._files.shift = mock.fn();
      queue.process();

      assert.strictEqual(queue._files.shift.mock.callCount(), 0);
    });

    it('should not do anything if active is exceeding limit', () => {
      queue._files = [1];
      queue.active = 11;
      // eslint-disable-next-line node-test/prefer-mock-method -- `mock.method` rejects arrays.
      queue._files.shift = mock.fn();
      queue.process();

      assert.strictEqual(queue._files.shift.mock.callCount(), 0);
    });

    describe('testing positive case', () => {
      it('should increase active count call spriter._transformShape and shape.complement and then', async () => {
        const TEST_FILE = 'file';
        const TEST_SHAPE = {
          complement: mock.fn(fn => {
            fn(TEST_SHAPE);
          }),
        };
        const testFn = mock.fn();
        queue._files = [1];
        queue.active = 2;
        // eslint-disable-next-line node-test/prefer-mock-method -- `mock.method` rejects arrays.
        queue._files.shift = mock.fn(() => (TEST_FILE));
        mockShape.mock.mockImplementation(() => TEST_SHAPE);

        mock.method(queue, 'remove').mock.mockImplementation(() => {
          testFn();
        });

        queue.process();
        await new Promise(setImmediate); // Await all async code to finish (async.waterfall)

        assert.strictEqual(queue.active, 3);
        assert.strictEqual(spriter._transformShape.mock.callCount(), 1);
        assert.strictEqual(spriter._transformShape.mock.calls[0].arguments[0], TEST_SHAPE);
        assert.strictEqual(typeof spriter._transformShape.mock.calls[0].arguments[1], 'function');
        assert.strictEqual(TEST_SHAPE.complement.mock.callCount(), 1);
        assert.strictEqual(typeof TEST_SHAPE.complement.mock.calls[0].arguments[0], 'function');
        assert.ok(testFn.mock.calls.some(call => isDeepStrictEqual(call.arguments, [])), 'expected a matching call');
      });

      it('should not increase active call _spriter.error and emit "remove" event if error occured', async () => {
        const TEST_FILE = new File({path: '/base/file', base: '/base/'});
        const TEST_ERROR_MESSAGE = 'error';
        queue._files = [1];
        queue.active = 2;
        // eslint-disable-next-line node-test/prefer-mock-method -- `mock.method` rejects arrays.
        queue._files.shift = mock.fn(() => (TEST_FILE));
        // Replacing `emit` (instead of spying) keeps event listeners from
        // re-entering `process()` through the constructor's `remove` listener.
        // eslint-disable-next-line node-test/prefer-mock-method -- spy would re-enter process().
        queue.emit = mock.fn();
        mockShape.mock.mockImplementation(() => {
          throw new Error(TEST_ERROR_MESSAGE);
        });

        queue.process();
        await new Promise(setImmediate); // Await all async code to finish (async.waterfall)

        assert.strictEqual(queue.active, 2);
        assert.ok(spriter.error.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['Skipping "%s" (%s)', 'file', TEST_ERROR_MESSAGE])), 'expected a matching call');
        assert.strictEqual(spriter._errorSkipped, 1);
        const skipCall = queue.emit.mock.calls.find(call => call.arguments[0] === 'shape-skipped');
        assert.ok(skipCall);
        assert.strictEqual(skipCall.arguments[1].file, 'file');
        assert.ok(skipCall.arguments[1].error instanceof Error);
        assert.ok(queue.emit.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['remove'])), 'expected a matching call');
      });

      it('should not increase active call _spriter.error and emit "remove" event if error occured and active is zero', async () => {
        const TEST_FILE = new File({path: '/base/file', base: '/base/'});
        queue._files = [1];
        queue.active = 0;
        // `shift()` is stubbed here, so drain the queue explicitly: `empty`
        // may only be emitted once no file is waiting anymore.
        // eslint-disable-next-line node-test/prefer-mock-method -- `mock.method` rejects arrays.
        queue._files.shift = mock.fn(() => {
          queue._files.length = 0;
          return TEST_FILE;
        });
        // Replacing `emit` (instead of spying) keeps event listeners from
        // re-entering `process()` through the constructor's `remove` listener.
        // eslint-disable-next-line node-test/prefer-mock-method -- spy would re-enter process().
        queue.emit = mock.fn();
        mockShape.mock.mockImplementation(() => {
          throw new Error('test');
        });

        queue.process();
        await new Promise(setImmediate); // Await all async code to finish (async.waterfall)

        assert.strictEqual(queue.active, 0);
        assert.ok(queue.emit.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['empty'])), 'expected a matching call');
      });
    });
  });
});

/* eslint-enable max-nested-callbacks */
