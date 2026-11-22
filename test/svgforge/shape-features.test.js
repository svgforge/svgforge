import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, it} from 'node:test';
import SVGSpriter from '../../lib/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.resolve(__dirname, '../fixture/svg/single/weather-clear.svg');
const svg = fs.readFileSync(fixture, 'utf8');

describe('shape features', () => {
  it('should skip duplicate shapes when dedupe is enabled', async () => {
    const spriter = new SVGSpriter({shape: {dedupe: true}, mode: {symbol: true}});
    spriter.add(path.resolve('a.svg'), null, svg);
    spriter.add(path.resolve('b.svg'), null, svg);
    const {data} = await spriter.compile();

    assert.equal(data.symbol.shapes.length, 1);
  });

  it('should keep duplicate shapes when dedupe is disabled', async () => {
    const spriter = new SVGSpriter({shape: {dedupe: false}, mode: {symbol: true}});
    spriter.add(path.resolve('a.svg'), null, svg);
    spriter.add(path.resolve('b.svg'), null, svg);
    const {data} = await spriter.compile();

    assert.equal(data.symbol.shapes.length, 2);
  });

  it('should auto-generate title when shape.accessibility.autoTitle is true', async () => {
    const spriter = new SVGSpriter({shape: {accessibility: {autoTitle: true}}, mode: {symbol: true}});
    spriter.add(fixture, 'weather-clear.svg', svg);
    const {result} = await spriter.compile();
    const sprite = result.symbol.sprite.contents.toString();

    assert.match(sprite, /<title[^>]*>Weather Clear<\/title>/u);
  });

  it('should accept SVGO preset configuration', async () => {
    const spriter = new SVGSpriter({
      shape: {transform: [{svgo: {preset: 'safe'}}]},
      mode: {symbol: true},
    });
    spriter.add(fixture, 'weather-clear.svg', svg);
    const {result} = await spriter.compile();

    assert.match(result.symbol.sprite.contents.toString(), /<svg/u);
  });
});
