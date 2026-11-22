import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, it} from 'node:test';
import SVGSpriter from '../../lib/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.resolve(__dirname, '../fixture/svg/single/weather-clear.svg');
const svg = fs.readFileSync(fixture, 'utf8');

describe('manifest output', () => {
  it('should create a manifest file when enabled', async () => {
    const spriter = new SVGSpriter({mode: {symbol: {manifest: true}}});
    spriter.add(fixture, 'weather-clear.svg', svg);
    const {result} = await spriter.compile();

    assert.ok(result.symbol.manifest);
    const manifest = JSON.parse(result.symbol.manifest.contents.toString());
    assert.equal(manifest.mode, 'symbol');
    assert.equal(manifest.key, 'symbol');
    assert.equal(manifest.sprite, 'sprite.symbol.svg');
    assert.equal(manifest.shapes.length, 1);
    assert.equal(manifest.shapes[0].name, 'weather-clear');
    assert.equal(typeof manifest.shapes[0].width, 'number');
    assert.equal(typeof manifest.shapes[0].height, 'number');
  });

  it('should support custom manifest destination', async () => {
    const spriter = new SVGSpriter({mode: {symbol: {manifest: {dest: 'icons.json'}}}});
    spriter.add(fixture, 'weather-clear.svg', svg);
    const {result} = await spriter.compile();

    assert.ok(result.symbol.manifest);
    assert.match(result.symbol.manifest.path, /icons\.json$/u);
  });
});
