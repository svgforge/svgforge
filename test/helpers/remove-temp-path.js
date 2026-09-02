
import {rm} from 'node:fs/promises';
import {paths} from './constants.js';
/**
 Removing tempPath for tests

 @param {string} pathName directory to remove
 @returns {Promise<void>}
 */
export default async function removeTemporaryPath(pathName = paths.tmp) {
  await rm(pathName, {force: true, recursive: true});
}
