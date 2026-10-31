import path from 'node:path';
import assert from 'node:assert/strict';
import {before as beforeAll, describe, it} from 'node:test';
import SVGSpriter from '../../../lib/svgforge.js';
import {addFixtureFiles} from '../../../test-utils/add-files.js';
import {constants} from '../../../test-utils/fixture-configs.js';
import {paths} from '../../../test-utils/constants.js';
import removeTmpPath from '../../../test-utils/remove-temp-path.js';

const temporaryPath = paths.tmp + '/view';

describe('svg-sprite: «view» mode', () => {
  const testConfig = constants.DEFAULT;

  let spriter;
  let result;
  let data;
  let svg;

  beforeAll(async () => {
    await removeTmpPath(temporaryPath);

    spriter = new SVGSpriter({dest: temporaryPath});
    addFixtureFiles(spriter, testConfig.files, testConfig.cwd);
    ({result, data} = await spriter.compileAsync({
      view: {
        sprite: 'svg/sprite.view.svg',
        bust: false,
        render: {
          css: true,
        },
      },
    }));

    svg = result.view.sprite.contents.toString('utf8');
  });

  it('composes the sprite from <view> elements and embedded shapes', () => {
    const [firstView, ...rest] = svg.split('<view').slice(1);

    assert.ok(svg.includes('<svg '));
    assert.ok(firstView.includes('id="weather-clear"'));
    assert.match(firstView, /viewBox="0 0 \d+ \d+"\/>/u);
    assert.ok(rest.length > 0);
  });

  it('adds the sprite dimensions to the root <svg> element', () => {
    assert.match(svg, /<svg[^>]*viewBox="0 0 \d+ \d+"/u);
    assert.match(svg, new RegExp(`width="${data.view.spriteWidth}"`, 'u'));
    assert.match(svg, new RegExp(`height="${data.view.spriteHeight}"`, 'u'));
  });

  it('exposes the shape dimensions selectors', () => {
    assert.deepStrictEqual(data.view.shapes[0].selector.dimensions, [{
      expression: '.svg-weather-clear-dims',
      raw: '.svg-weather-clear-dims',
      first: true,
      last: true,
    }]);
  });

  it('renders the dimensions stylesheet resource', () => {
    const css = result.view.css.contents.toString('utf8');
    assert.strictEqual(path.extname(result.view.css.path), '.css');
    assert.ok(css.includes('.svg-weather-clear-dims'));
  });

  it('supports a dimensions configuration containing "%s"', async () => {
    const variantSpriter = new SVGSpriter({dest: temporaryPath});
    addFixtureFiles(variantSpriter, testConfig.files, testConfig.cwd);
    const {result: variant} = await variantSpriter.compileAsync({
      view: {
        sprite: 'svg/sprite.view.svg',
        bust: false,
        dimensions: '%s-size',
        render: {
          css: true,
        },
      },
    });

    const css = variant.view.css.contents.toString('utf8');
    assert.ok(css.includes('.svg-weather-clear-size'));
  });
});
