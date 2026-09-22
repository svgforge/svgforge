import process from 'node:process';
import {format} from 'node:util';

const LEVELS = ['error', 'warn', 'info', 'verbose', 'debug'];

/**
 Create a minimal console logger mirroring the winston logger surface the
 spriter relies on (`level`, `transports`, `log`/`info`/`verbose`/`debug`/
 `warn`/`error`). Output is written to stdout in the familiar
 `YYYY-MM-DD HH:MM:ss.SSS - level: message` format.

 @param {object} [options] Configuration object
 @param {string} [options.level] Minimum log level (`error`..`debug`)
 @param {boolean} [options.silent] Suppress all output
 @returns {object} The created logger
 */
export function createLogger({level = 'info', silent = false} = {}) {
  const transport = {level, silent};

  const emit = (messageLevel, args) => {
    if (silent || LEVELS.indexOf(messageLevel) > LEVELS.indexOf(transport.level)) {
      return;
    }

    const now = new Date();
    const pad = (value, length = 2) => String(value).padStart(length, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} `
      + `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;

    process.stdout.write(`${timestamp} - ${messageLevel}: ${format(...args)}\n`);
  };

  return {
    level,
    transports: [transport],
    log(messageLevel, ...args) {
      emit(String(messageLevel), args);
    },
    info: (...args) => emit('info', args),
    verbose: (...args) => emit('verbose', args),
    debug: (...args) => emit('debug', args),
    warn: (...args) => emit('warn', args),
    error: (...args) => emit('error', args),
  };
}
