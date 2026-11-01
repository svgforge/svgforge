import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import SVGSpriter from '../../lib/svgforge.js';
import {addFixtureFiles} from '../../test-utils/add-files.js';
import {constants} from '../../test-utils/fixture-configs.js';
import {paths} from '../../test-utils/constants.js';
import removeTmpPath from '../../test-utils/remove-temp-path.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_CONFIG = constants.DEFAULT;
const temporaryPath = path.join(paths.tmp, 'custom-template');
const customTemplate = path.join(__dirname, '../fixture/templates/custom-example.vto');
const customDest = 'custom.html';

describe('custom templates', () => {
  it('should render the HTML example with a custom Vento template', async () => {
    await removeTmpPath(temporaryPath);

    const spriter = new SVGSpriter({dest: temporaryPath});
    addFixtureFiles(spriter, TEST_CONFIG.files, TEST_CONFIG.cwd);

    const {result} = await spriter.compileAsync({
      defs: {
        sprite: 'svg/sprite.defs.svg',
        example: {
          template: customTemplate,
          dest: customDest,
        },
      },
    });

    const exampleOutput = result.defs.example.contents.toString();

    assert.deepStrictEqual(result.defs.example.path, path.join(temporaryPath, 'defs', customDest));
    assert.ok(exampleOutput.includes('<title>defs custom example</title>'));
    assert.ok(exampleOutput.includes('<ul>'));
    assert.ok(exampleOutput.includes('<li title="weather-clear">'));
    assert.ok(exampleOutput.includes('<li title="weather-storm~hover">'));
    assert.ok(exampleOutput.includes('<svg viewBox="0 0 48 48">'));
    assert.ok(exampleOutput.includes('<use href="svg/sprite.defs.svg#weather-clear"/>'));
  });

  it('should default to the built-in sprite.vto template when example is true', async () => {
    await removeTmpPath(temporaryPath);

    const spriter = new SVGSpriter({dest: temporaryPath});
    addFixtureFiles(spriter, TEST_CONFIG.files, TEST_CONFIG.cwd);

    const {result} = await spriter.compileAsync({
      defs: {
        sprite: 'svg/sprite.defs.svg',
        example: true,
      },
    });

    const exampleOutput = result.defs.example.contents.toString();

    assert.ok(exampleOutput.includes('<h1>SVG <code>&lt;defs&gt;</code> sprite preview (external)</h1>'));
    assert.ok(exampleOutput.includes('<figcaption'));
    assert.ok(exampleOutput.includes('Copy ID'));
  });
});
