import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {before as beforeAll, describe, it} from 'node:test';
import SVGSpriter from '../../lib/svgforge.js';
import {addFixtureFiles} from '../../test-utils/add-files.js';
import {paths} from '../../test-utils/constants.js';
import removeTmpPath from '../../test-utils/remove-temp-path.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('svg-sprite: layouter fileSize data', () => {
  const temporaryPath = path.join(paths.tmp, 'layouter-filesize');
  let fixtest = '';

  beforeAll(async () => {
    await removeTmpPath(temporaryPath);
    fixtest = path.join(__dirname, '../fixture/svg/single/weather-clear.svg');
  });

  it('renders the file size when a mode enables the example', async () => {
    const spriter = new SVGSpriter({dest: temporaryPath});
    addFixtureFiles(spriter, ['weather-clear.svg'], path.dirname(fixtest));

    const {data} = await spriter.compileAsync({
      stack: {
        sprite: 'svg/sprite.svg',
        render: {
          css: true,
        },
        example: true,
      },
    });

    assert.strictEqual(data.stack.shapes.length, 1);
    assert.match(data.stack.shapes[0].fileSize, /^\d+(?:\.\d+)? kB$/u);
  });

  it('leaves the file size empty when no mode enables the example', async () => {
    const spriter = new SVGSpriter({dest: temporaryPath});
    addFixtureFiles(spriter, ['weather-clear.svg'], path.dirname(fixtest));

    const {data} = await spriter.compileAsync({
      stack: {
        sprite: 'svg/sprite.svg',
        render: {
          css: true,
        },
      },
    });

    assert.strictEqual(data.stack.shapes.length, 1);
    assert.strictEqual(data.stack.shapes[0].fileSize, null);
  });

  it('renders a copy button for each shape in the HTML example', async () => {
    const spriter = new SVGSpriter({dest: temporaryPath});
    addFixtureFiles(spriter, ['weather-clear.svg'], path.dirname(fixtest));

    const {result} = await spriter.compileAsync({
      defs: {
        sprite: 'svg/sprite.svg',
        example: true,
      },
    });

    const html = result.defs.example.contents.toString('utf8');

    assert.ok(html.includes('data-copy-label="Copy ID"'));
    assert.ok(html.includes('data-copy="weather-clear"'));
    assert.ok(html.includes('<button type="button" class="copy" data-copy="weather-clear" data-copy-label="Copy ID">Copy ID</button>'));
  });
});
