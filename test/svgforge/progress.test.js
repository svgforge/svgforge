import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {describe, it, mock} from 'node:test';
import SVGSpriter from '../../lib/svgforge.js';
import {addFixtureFiles} from '../../test-utils/add-files.js';
import {constants} from '../../test-utils/fixture-configs.js';
import {paths} from '../../test-utils/constants.js';
import removeTmpPath from '../../test-utils/remove-temp-path.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_CONFIG = constants.DEFAULT;
const temporaryPath = path.join(paths.tmp, 'progress');

describe('progress events', () => {
  it('should emit one progress event per processed shape with processed/total', async () => {
    await removeTmpPath(temporaryPath);

    const spriter = new SVGSpriter({dest: temporaryPath});
    const progress = mock.fn();
    spriter.on('progress', progress);

    addFixtureFiles(spriter, TEST_CONFIG.files, TEST_CONFIG.cwd);
    const expectedTotal = TEST_CONFIG.files.length;

    await new Promise((resolve, reject) => {
      spriter.compile(error => error ? reject(error) : resolve());
    });

    assert.strictEqual(progress.mock.callCount(), expectedTotal);

    const {calls} = progress.mock;
    let lastProcessed = 0;
    /* eslint-disable node-test/no-conditional-assertion -- every recorded event must be checked */
    for (const call of calls) {
      const {processed, total} = call.arguments[0];
      assert.strictEqual(processed, lastProcessed + 1);
      assert.strictEqual(processed <= total, true);
      assert.strictEqual(total <= expectedTotal, true);
      lastProcessed = processed;
    }
    /* eslint-enable node-test/no-conditional-assertion */

    // After all shapes are added, the final event reports the full total
    const last = calls.at(-1).arguments[0];
    assert.strictEqual(last.processed, expectedTotal);
    assert.strictEqual(last.total, expectedTotal);
  });

  it('should not emit progress when no shapes are added', async () => {
    await removeTmpPath(temporaryPath);

    const spriter = new SVGSpriter({dest: temporaryPath});
    const progress = mock.fn();
    spriter.on('progress', progress);

    await new Promise((resolve, reject) => {
      spriter.compile(error => error ? reject(error) : resolve());
    });

    assert.strictEqual(progress.mock.callCount(), 0);
  });
});
