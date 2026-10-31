import path from 'node:path';
import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import SVGSpriter from '../../lib/svgforge.js';
import {addFixtureFiles} from '../../test-utils/add-files.js';
import {constants} from '../../test-utils/fixture-configs.js';
import {paths} from '../../test-utils/constants.js';
import removeTmpPath from '../../test-utils/remove-temp-path.js';

const TEST_CONFIG = constants.DEFAULT;
const temporaryPath = path.join(paths.tmp, 'preview-layouts');

/**
 Render the HTML example for a single mode

 @param {string} mode Sprite mode
 @param {object} modeConfig Mode configuration
 @returns {Promise<string>} Rendered example document
 */
async function renderExample(mode, modeConfig) {
  await removeTmpPath(temporaryPath);

  const spriter = new SVGSpriter({dest: temporaryPath});
  addFixtureFiles(spriter, TEST_CONFIG.files, TEST_CONFIG.cwd);

  const {result} = await spriter.compileAsync({
    [mode]: {
      sprite: `svg/sprite.${mode}.svg`,
      example: true,
      ...modeConfig,
    },
  });

  return result[mode].example.contents.toString();
}

describe('preview layouts', () => {
  it('should use the external layout by default', async () => {
    const exampleOutput = await renderExample('defs', {});

    assert.ok(exampleOutput.includes('directory URL ending in a slash'));
    assert.ok(exampleOutput.includes('<use href="svg/sprite.defs.svg#weather-clear"></use>'));
    assert.ok(!exampleOutput.includes('This is an inlined version of the generated SVG sprite'));
    assert.ok(!exampleOutput.includes('Inline SVG'));
    assert.ok(!exampleOutput.includes('inline SVG'));
    assert.ok(exampleOutput.includes('<h1>SVG <code>&lt;defs&gt;</code> sprite preview (external)</h1>'));
  });

  it('should use the inline layout when inline is enabled', async () => {
    const exampleOutput = await renderExample('defs', {inline: true});

    assert.ok(exampleOutput.includes('This is an inlined version of the generated SVG sprite'));
    assert.ok(exampleOutput.includes('<use href="#weather-clear"></use>'));
    assert.ok(exampleOutput.includes('The embedded sprite slightly differs'));
    assert.ok(!exampleOutput.includes('directory URL ending in a slash'));
    assert.ok(exampleOutput.includes('<h3>Inline SVG with <code>&lt;use&gt;</code> references</h3>'));
    assert.ok(exampleOutput.includes('<h3>Inline SVG, sized by viewBox only (stacksvg-style)</h3>'));
    assert.ok(exampleOutput.includes('<h1>SVG <code>&lt;defs&gt;</code> sprite preview (inline)</h1>'));
  });

  it('should render section headings without letter prefixes or inline wording', async () => {
    const exampleOutput = await renderExample('defs', {});

    assert.ok(exampleOutput.includes('<h3>SVG with <code>&lt;use&gt;</code> references</h3>'));
    assert.ok(exampleOutput.includes('<h3>SVG, sized by viewBox only (stacksvg-style)</h3>'));
    assert.ok(!exampleOutput.includes('A) '));
    assert.ok(!exampleOutput.includes('B) '));
    assert.ok(!exampleOutput.includes('C) '));
  });

  it('should render the symbol preview with the inline layout', async () => {
    const exampleOutput = await renderExample('symbol', {inline: true});

    assert.ok(exampleOutput.includes('<use href="#weather-clear"></use>'));
    assert.ok(exampleOutput.includes('<h1>SVG <code>&lt;symbol&gt;</code> sprite preview (inline)</h1>'));
    assert.ok(!exampleOutput.includes('A) '));
  });

  it('should render the stack preview with all three sections', async () => {
    const exampleOutput = await renderExample('stack', {});

    assert.ok(exampleOutput.includes('<h3>SVG stack</h3>'));
    assert.ok(exampleOutput.includes('<h3>SVG, sized by viewBox only (stacksvg-style)</h3>'));
    assert.ok(exampleOutput.includes('<h3>Sprite as CSS background image (inline style)</h3>'));
    assert.ok(exampleOutput.includes('<img src="svg/sprite.stack.svg#weather-clear"'));
    assert.ok(exampleOutput.includes('<use href="svg/sprite.stack.svg#weather-clear"></use>'));
    assert.ok(!exampleOutput.includes('B) '));
    assert.ok(!exampleOutput.includes('C) '));
  });

  it('should render the view preview without template leftovers', async () => {
    const exampleOutput = await renderExample('view', {});

    assert.match(exampleOutput, /<img src="svg\/sprite\.view[^"]*#weather-clear"/u);
    assert.ok(!exampleOutput.includes('{{'));
    assert.ok(!exampleOutput.includes('undefined'));
  });
});
