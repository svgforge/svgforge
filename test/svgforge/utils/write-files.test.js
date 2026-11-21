import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {describe, it} from 'node:test';
import {Buffer} from 'node:buffer';
import writeFiles from '../../../lib/svgforge/utils/write-files.js';

describe('writeFiles', () => {
  it('recursively writes file objects and returns the count', t => {
    const temporaryDirectory = fs.mkdtempSync(path.join('/tmp/opencode', 'write-files-'));
    t.after(() => fs.rmSync(temporaryDirectory, {recursive: true, force: true}));

    const files = {
      mode: {
        sprite: {
          path: path.join(temporaryDirectory, 'a', 'sprite.svg'),
          contents: Buffer.from('<svg/>'),
        },
        css: {
          path: path.join(temporaryDirectory, 'a', 'sprite.css'),
          contents: Buffer.from('.x{}'),
        },
      },
    };

    const written = writeFiles(files);

    assert.equal(written, 2);
    assert.equal(fs.readFileSync(path.join(temporaryDirectory, 'a', 'sprite.svg'), 'utf8'), '<svg/>');
    assert.equal(fs.readFileSync(path.join(temporaryDirectory, 'a', 'sprite.css'), 'utf8'), '.x{}');
  });
});
