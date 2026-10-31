import {Buffer} from 'node:buffer';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, it, mock} from 'node:test';
import SVGSpriter from '../../../lib/svgforge.js';
import DimensionsCalculationError from '../../../lib/svgforge/errors/dimensions-calculation-error.js';
import {isResvgAvailable} from '../../../lib/svgforge/utils/calculate-svg-dimensions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_SVG = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

describe('dimension fallback without @resvg/resvg-js', () => {
  it('should warn with an install hint and skip a shape without dimensions when the fallback is unavailable', async t => {
    // The real fallback path can only be exercised while the optional package
    // is not installed. The package is no longer a dev dependency, so this
    // test runs by default; it skips in environments that installed it
    // manually on top of the dev dependencies.
    if (isResvgAvailable()) {
      t.skip('requires a build without @resvg/resvg-js');
      return;
    }

    const spriter = new SVGSpriter({
      shape: {
        dest: 'svg',
        dimension: {
          maxWidth: 4000,
          maxHeight: 4000,
        },
      },
    });

    // Capture the warning the queue emits for the skipped shape
    mock.method(spriter, 'warn');

    // The queue also signals the skip as a structured event on the spriter
    const onSkipped = mock.fn();
    spriter.on('shape-skipped', onSkipped);

    const svgFilePath = path.join(__dirname, '../../fixture/svg/special/without-dims/46x46.svg');
    spriter.add(svgFilePath, '46x46.svg', Buffer.from(TEST_SVG));

    const {result} = await spriter.compileAsync();

    t.assert.ok(spriter.warn.mock.callCount() > 0);
    t.assert.strictEqual(spriter.warn.mock.calls[0].arguments[0], 'Skipping "%s" (%s)');
    t.assert.ok(spriter.warn.mock.calls[0].arguments[2].includes('npm install @resvg/resvg-js'));
    t.assert.strictEqual(spriter._dimensionSkipped, 1);
    t.assert.deepStrictEqual(result.shapes, []);

    t.assert.ok(onSkipped.mock.callCount() > 0);
    t.assert.strictEqual(onSkipped.mock.calls[0].arguments[0].file, '46x46');
    t.assert.strictEqual(onSkipped.mock.calls[0].arguments[0].error instanceof DimensionsCalculationError, true);
    t.assert.ok(onSkipped.mock.calls[0].arguments[0].error.message.includes('npm install @resvg/resvg-js'));
  });
});
