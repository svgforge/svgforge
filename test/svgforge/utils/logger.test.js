import process from 'node:process';
import assert from 'node:assert/strict';
import {
  afterEach,
  describe,
  it,
  mock,
} from 'node:test';
import {createLogger} from '../../../lib/svgforge/utils/logger.js';

describe('testing createLogger()', () => {
  let stdoutWriteSpy;

  afterEach(() => {
    mock.restoreAll();
  });

  const spyStdout = () => {
    stdoutWriteSpy = mock.method(process.stdout, 'write', () => true);
  };

  it('should write messages at or above the configured level to stdout', () => {
    spyStdout();
    const logger = createLogger({level: 'info'});

    logger.info('Hello %s', 'world');
    logger.debug('hidden');

    assert.strictEqual(stdoutWriteSpy.mock.callCount(), 1);
    assert.match(stdoutWriteSpy.mock.calls[0].arguments[0], /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} - info: Hello world\n$/u);
  });

  it('should write error and warn messages', () => {
    spyStdout();
    const logger = createLogger({level: 'debug'});

    logger.error('boom');
    logger.warn('careful');
    logger.debug('detail');
    logger.verbose('verbose message');

    assert.strictEqual(stdoutWriteSpy.mock.callCount(), 4);
  });

  it('should expose a winston-compatible surface', () => {
    const logger = createLogger({level: 'verbose'});

    assert.strictEqual(logger.level, 'verbose');
    assert.strictEqual(logger.transports.length, 1);
    assert.strictEqual(logger.transports[0].level, 'verbose');
    assert.strictEqual(typeof logger.log, 'function');
    assert.strictEqual(typeof logger.info, 'function');
  });

  it('should not write anything when silent', () => {
    spyStdout();
    const logger = createLogger({level: 'debug', silent: true});

    logger.info('not shown');
    logger.error('not shown');

    assert.strictEqual(stdoutWriteSpy.mock.callCount(), 0);
  });

  it('should route explicit log() calls through emit', () => {
    spyStdout();
    const logger = createLogger({level: 'warn'});

    logger.log('warn', 'careful');
    logger.log('info', 'hidden below warn');

    assert.strictEqual(stdoutWriteSpy.mock.callCount(), 1);
  });
});
