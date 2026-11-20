
import {Buffer} from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import {isObject} from '../lib/svgforge/utils/index.js';
/**
 Recursively write files to disc

 @param {object | Array} files nested structure of file objects to write
 @returns {number} count of files written
 */
export default function writeFiles(files) {
  let written = 0;
  for (const file of Object.values(files)) {
    if (isObject(file) || Array.isArray(file)) {
      if (typeof file.path === 'string' && (Buffer.isBuffer(file.contents) || typeof file.contents === 'string')) {
        fs.mkdirSync(path.dirname(file.path), {recursive: true});
        fs.writeFileSync(file.path, file.contents);
        ++written;
      } else {
        written += writeFiles(file);
      }
    }
  }

  return written;
}
