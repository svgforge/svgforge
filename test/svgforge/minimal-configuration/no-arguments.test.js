
import path from 'node:path';
import {globSync} from 'node:fs';
import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';
import SVGSpriter from '../../../lib/svgforge.js';
import {addFixtureFiles, addRelativeFixtureFiles} from '../../../test-utils/add-files.js';
import {paths} from '../../../test-utils/constants.js';

const cwdWeather = path.join(paths.fixtures, 'svg/single');
const weather = globSync('**/weather*.svg', {cwd: cwdWeather}).toSorted((a, b) => b.localeCompare(a));

describe('svg-sprite: with no arguments', () => {
  let spriter;

  beforeEach(() => {
    spriter = new SVGSpriter({
      shape: {
        dest: 'svg',
      },
    });
  });

  it('with no SVG files has an empty result', async () => {
    const {result, data} = await spriter.compileAsync();

    assert.ok(result instanceof Object);
    assert.ok(Object.hasOwn(result, 'shapes'));
    assert.ok(Array.isArray(result.shapes));
    assert.strictEqual(result.shapes.length, 0);
    assert.ok(data instanceof Object);
    assert.deepStrictEqual(data, {});
  });

  it(`with ${weather.length} SVG files returns ${weather.length} optimized shapes`, async () => {
    addFixtureFiles(spriter, weather, cwdWeather);
    const {result, data} = await spriter.compileAsync();

    assert.ok(result instanceof Object);
    assert.ok(Object.hasOwn(result, 'shapes'));
    assert.ok(Array.isArray(result.shapes));
    assert.strictEqual(result.shapes.length, weather.length);
    assert.ok(data instanceof Object);
    assert.deepStrictEqual(data, {});
  });

  it(`with ${weather.length} SVG files with relative paths returns ${weather.length} optimized shapes`, async () => {
    addRelativeFixtureFiles(spriter, weather, cwdWeather);

    const {result, data} = await spriter.compileAsync();

    assert.ok(result instanceof Object);
    assert.ok(Object.hasOwn(result, 'shapes'));
    assert.ok(Array.isArray(result.shapes));
    assert.strictEqual(result.shapes.length, weather.length);
    assert.ok(data instanceof Object);
    assert.deepStrictEqual(data, {});
  });
});
