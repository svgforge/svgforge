
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
/**
 Prepare and output a file and create directories as necessary

 @param {string} file output path to write
 @param {string} content file contents to write
 @returns {string|undefined} the file path, or undefined on failure
 */
export default async function writeFileSafe(file, content) {
  try {
    await mkdir(path.dirname(file), {recursive: true});
    await writeFile(file, content);
    return file;
  } catch {
    return null;
  }
}
