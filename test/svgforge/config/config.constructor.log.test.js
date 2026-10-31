import assert from 'node:assert/strict';
import {
  after as afterAll,
  before as beforeAll,
  describe,
  it,
  mock,
} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import SVGSpriterConfig from '../../../lib/svgforge/config.js';

describe('testing log', () => {
  const getLogger = () => ({
    level: 'info',
    transports: [{
      level: 'info',
    }],
    log: mock.fn(),
    debug: mock.fn(),
    info: mock.fn(),
    verbose: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
  });

  it('should keep a logger if it is passed as config.log', () => {
    const TEST_LOGGER = getLogger();
    const config = new SVGSpriterConfig({
      log: TEST_LOGGER,
    });

    assert.deepStrictEqual(config.log, TEST_LOGGER);
  });

  it('should call debug 6 times and verbose 1 time if shape has no meta and align', () => {
    const TEST_LOGGER = getLogger();

    mock.method(TEST_LOGGER, 'debug');
    mock.method(TEST_LOGGER, 'verbose');

    // eslint-disable-next-line no-new
    new SVGSpriterConfig({
      log: TEST_LOGGER,
    });

    assert.strictEqual(TEST_LOGGER.debug.mock.callCount(), 6);
    assert.strictEqual(TEST_LOGGER.debug.mock.calls[0].arguments[0], 'Started logging');
    assert.strictEqual(TEST_LOGGER.debug.mock.calls[1].arguments[0], 'Prepared general options');
    assert.strictEqual(TEST_LOGGER.debug.mock.calls[2].arguments[0], 'Prepared `shape` options');
    assert.strictEqual(TEST_LOGGER.debug.mock.calls[3].arguments[0], 'Prepared `svg` options');
    assert.strictEqual(TEST_LOGGER.debug.mock.calls[4].arguments[0], 'Prepared `mode` options');
    assert.strictEqual(TEST_LOGGER.debug.mock.calls[5].arguments[0], 'Prepared `variables` options');
    assert.strictEqual(TEST_LOGGER.verbose.mock.callCount(), 1);
    assert.ok(TEST_LOGGER.verbose.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['Initialized spriter configuration'])), 'expected a matching call');
  });

  describe('should create default logger', () => {
    const originalConsole = console;

    beforeAll(() => {
      // Suppressing console
      console._stdout = {
        write: mock.fn(),
      };
    });

    afterAll(() => {
      // eslint-disable-next-line unicorn/no-global-object-property-assignment -- Test asserts global side effect.
      globalThis.console = originalConsole;
    });

    for (const logLevel of ['info', 'verbose', 'debug']) {
      it(`non-silent with ${logLevel} log level if passed config.log has ${logLevel} value`, () => {
        const config = new SVGSpriterConfig({
          log: logLevel,
        });

        assert.ok(Array.isArray(config.log.transports));
        assert.strictEqual(config.log.transports.length, 1);
        assert.strictEqual(config.log.transports[0].level, logLevel);
        assert.strictEqual(config.log.transports[0].silent, false);
      });
    }

    it('non-silent with info level if passed truthy value', () => {
      const config = new SVGSpriterConfig({
        log: true,
      });

      assert.ok(Array.isArray(config.log.transports));
      assert.strictEqual(config.log.transports.length, 1);
      assert.strictEqual(config.log.transports[0].level, 'info');
      assert.strictEqual(config.log.transports[0].silent, false);
    });

    it('silent with info level if passed falsy value', () => {
      const config = new SVGSpriterConfig({
        log: false,
      });

      assert.ok(Array.isArray(config.log.transports));
      assert.strictEqual(config.log.transports.length, 1);
      assert.strictEqual(config.log.transports[0].level, 'info');
      assert.strictEqual(config.log.transports[0].silent, true);
    });
  });
});
