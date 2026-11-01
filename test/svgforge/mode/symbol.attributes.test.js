import path from 'node:path';
import process from 'node:process';
import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import SVGSpriter from '../../../lib/svgforge.js';

const TEST_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-hidden="true" aria-label="Search" data-internal="yes"><path d="M0 0h24v24H0z"/></svg>';

const buildSymbol = async svgMarkup => {
  const spriter = new SVGSpriter({dest: path.join(process.cwd(), 'tmp')});
  spriter.add(path.join('/', 'base', 'icon.svg'), 'icon.svg', svgMarkup);
  const {result} = await spriter.compileAsync({symbol: {sprite: 'svg/sprite.svg'}});
  const sprite = result.symbol.sprite.contents.toString();
  return /<symbol[^>]*>/u.exec(sprite)[0];
};

describe('symbol mode attribute filtering', () => {
  it('should preserve the accessibility attributes aria-hidden, aria-label and role', async () => {
    const symbol = await buildSymbol(TEST_SVG);
    assert.ok(symbol.includes('role="img"'));
    assert.ok(symbol.includes('aria-hidden="true"'));
    assert.ok(symbol.includes('aria-label="Search"'));
  });

  it('should still strip attributes outside the whitelist', async () => {
    const symbol = await buildSymbol(TEST_SVG);
    assert.ok(!symbol.includes('data-internal'));
  });
});
