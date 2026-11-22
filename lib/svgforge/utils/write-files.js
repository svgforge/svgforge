import fs from 'node:fs';
import path from 'node:path';

/**
 Recursively write compiled sprite resources to disk

 @param {Record<string, unknown>} files Nested map of file objects
 @returns {number} Number of written files
 */
export default function writeFiles(files) {
  let written = 0;

  for (const file of Object.values(files)) {
    if (typeof file !== 'object' || file === null) {
      continue;
    }

    if (typeof file.path === 'string') {
      fs.mkdirSync(path.dirname(file.path), {recursive: true});
      fs.writeFileSync(file.path, file.contents);
      ++written;
    } else {
      written += writeFiles(file);
    }
  }

  return written;
}
