
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {
  after,
  before as beforeAll,
  describe,
  it,
} from 'node:test';
import {renderTemplate} from '../../../../lib/svgforge/utils/template.js';
import SVGSpriter from '../../../../lib/svgforge.js';
import {isResvgAvailable} from '../../../../lib/svgforge/utils/index.js';
import {addFixtureFiles} from '../../../../test-utils/add-files.js';
import writeFiles from '../../../../test-utils/write-files.js';
import writeFile from '../../../../test-utils/write-file.js';
import {constants} from '../../../../test-utils/fixture-configs.js';
import {paths} from '../../../../test-utils/constants.js';
import removeTmpPath from '../../../../test-utils/remove-temp-path.js';
import {assertVisuallyEqualHTML} from '../../../../test-utils/visual.js';
import {closeBrowser} from '../../../../test-utils/capture-browser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

after(closeBrowser);

for (const {name, testConfigKey} of [
  {name: 'default', testConfigKey: 'DEFAULT'},
  {name: 'w/o dims', testConfigKey: 'WITHOUT_DIMS'},
]) {
  describe(`svg-sprite: ${name}: «defs» mode`, () => {
    const testConfig = constants[testConfigKey];

    // Dimension-less icons can only be sized by the optional `@resvg/resvg-js`
    // fallback. Without it the shapes are skipped, so the visual expectations
    // only make sense while the fallback is installed (the skip warning itself
    // is covered by shape.dimension-fallback.test.js).
    const requiresDimensionFallback = testConfigKey === 'WITHOUT_DIMS' && !isResvgAvailable();

    const temporaryPath = path.join(paths.tmp, `defs${testConfig.namespace}`);

    let svg;
    let spriter;
    let data;

    beforeAll(async () => {
      if (requiresDimensionFallback) {
        return;
      }

      await removeTmpPath(temporaryPath);
      data = {};

      spriter = new SVGSpriter({dest: temporaryPath});
      addFixtureFiles(spriter, testConfig.files, testConfig.cwd);
      const {result, data: cssData} = await spriter.compileAsync({
        defs: {
          sprite: `svg/defs${testConfig.namespace}.svg`, render: {
            css: true,
          },
        },
      });
      writeFiles(result);
      data = cssData.defs;
      svg = path.basename(result.defs.sprite.path);
    });

    it('creates a visually correct stylesheet resource in CSS format', async t => {
      // The visual expectation needs the optional `@resvg/resvg-js` fallback
      // (see `requiresDimensionFallback`); without it the fixture shapes are
      // skipped, which is covered by shape.dimension-fallback.test.js.
      if (requiresDimensionFallback) {
        t.skip('requires @resvg/resvg-js');
        return;
      }

      data.svg = await readFile(path.join(temporaryPath, 'defs/svg', svg), 'utf8');
      data.css = '../sprite.css';

      t.assert.snapshot(data.svg);

      const out = await renderTemplate(path.join(__dirname, '../../../tmpl/defs.vto'), data);
      const preview = await writeFile(path.join(temporaryPath, `defs/html/defs${testConfig.namespace}.html`), out);
      const expected = path.join(paths.expectations, `png/defs${testConfig.namespace}.html.png`);

      await assertVisuallyEqualHTML(preview, expected);
    });
  });
}
