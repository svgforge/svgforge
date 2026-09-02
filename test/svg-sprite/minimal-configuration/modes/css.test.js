
/* eslint-disable max-nested-callbacks -- tests legitimately nest callbacks */

import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import mustache from 'mustache';
import sass from 'sass';
import {constants as testConfigs} from '../../../helpers/test-configs.js';
import SVGSpriter from '../../../../lib/svg-sprite.js';
import {addFixtureFiles} from '../../../helpers/add-files.js';
import writeFiles from '../../../helpers/write-files.js';
import removeTmpPath from '../../../helpers/remove-temp-path.js';
import {paths} from '../../../helpers/constants.js';
import writeFile from '../../../helpers/write-file.js';
import {
  beforeAll,
  describe,
  expect,
  it,
} from '../../../helpers/jest-compat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const previewTemplate = fs.readFileSync(path.join(__dirname, '../../../tmpl/css.html'), 'utf8');

describe('testing minimal config', () => {
  let spriter;
  const svg = {};
  let data;

  describe.each`
        name          | testConfigKey
        ${'default'}  | ${'DEFAULT'}
        ${'w/o dims'} | ${'WITHOUT_DIMS'}
    `('$name: with minimum configuration', ({testConfigKey}) => {
    const testConfig = testConfigs[testConfigKey];

    const temporaryPath = path.join(paths.tmp, `css${testConfig.namespace}`);

    beforeAll(async () => {
      await removeTmpPath(temporaryPath);
      data = {};
      spriter = new SVGSpriter({dest: temporaryPath});
      addFixtureFiles(spriter, testConfig.files, testConfig.cwd);
      const {result, data: cssData} = await spriter.compileAsync({
        css: {
          sprite: `svg/css.vertical${testConfig.namespace}.svg`,
          layout: 'vertical',
          dimensions: true,
          render: {
            css: {
              dest: `sprite${testConfig.namespace}.css`,
            },
            scss: {
              dest: `sprite${testConfig.namespace}.scss`,
            },
          },
        },
      });

      writeFiles(result);
      data = cssData.css;
      svg.vertical = path.basename(result.css.sprite.path);

      const promises = ['horizontal', 'diagonal', 'packed'].map(layout => new Promise((resolve, reject) => {
        spriter.compile({
          css: {
            sprite: `svg/css.${layout}${testConfig.namespace}.svg`,
            layout,
          },
        }, (error, layoutResult) => {
          if (error) {
            return reject(error);
          }

          writeFiles(layoutResult);
          svg[layout] = path.basename(layoutResult.css.sprite.path);
          resolve();
        });
      }));

      await Promise.all(promises);
    });

    // Test sprite renderings
    describe('creates visually correct sprite with', () => {
      // Vertical layout
      it('vertical layout', async () => {
        expect.hasAssertions();

        const input = path.join(temporaryPath, 'css/svg', svg.vertical);
        const actual = fs.readFileSync(input, 'utf8');
        const expected = path.join(paths.expectations, `png/css.vertical${testConfig.namespace}.png`);

        expect(actual).toMatchSnapshot();
        await expect(input).toBeVisuallyEqualTo(expected);
      });

      // Horizontal layout
      it('horizontal layout', async () => {
        expect.hasAssertions();

        const input = path.join(temporaryPath, 'css/svg', svg.horizontal);
        const actual = fs.readFileSync(input, 'utf8');
        const expected = path.join(paths.expectations, `png/css.horizontal${testConfig.namespace}.png`);

        expect(actual).toMatchSnapshot();
        await expect(input).toBeVisuallyEqualTo(expected);
      });

      // Diagonal layout
      it('diagonal layout', async () => {
        expect.hasAssertions();

        const input = path.join(temporaryPath, 'css/svg', svg.diagonal);
        const actual = fs.readFileSync(input, 'utf8');
        const expected = path.join(paths.expectations, `png/css.diagonal${testConfig.namespace}.png`);

        expect(actual).toMatchSnapshot();
        await expect(input).toBeVisuallyEqualTo(expected);
      });

      // Packed layout
      it('packed layout', async () => {
        expect.hasAssertions();

        const input = path.join(temporaryPath, 'css/svg', svg.packed);
        const actual = fs.readFileSync(input, 'utf8');
        const expected = path.join(paths.expectations, `png/css.packed${testConfig.namespace}.png`);

        expect(actual).toMatchSnapshot();
        await expect(input).toBeVisuallyEqualTo(expected);
      });
    });

    // Test stylesheet resources
    describe('creates a visually correct stylesheet resource in', () => {
      // Plain CSS
      it('CSS format', async () => {
        expect.hasAssertions();

        data.css = `../sprite${testConfig.namespace}.css`;

        const out = mustache.render(previewTemplate, data);
        const preview = await writeFile(path.join(temporaryPath, `css/html/css${testConfig.namespace}.html`), out);
        const expected = path.join(paths.expectations, `png/css.html${testConfig.namespace}.png`);

        await expect(preview).toBeVisuallyCorrectAsHTMLTo(expected);
      });

      // Sass
      it('Sass format', async () => {
        expect.hasAssertions();

        const scssText = sass.renderSync({file: path.join(temporaryPath, `css/sprite${testConfig.namespace}.scss`)});
        await writeFile(path.join(temporaryPath, `css/sprite${testConfig.namespace}.scss.css`), scssText.css);

        data.css = `../sprite${testConfig.namespace}.scss.css`;

        const out = mustache.render(previewTemplate, data);
        const preview = await writeFile(path.join(temporaryPath, `css/html/scss${testConfig.namespace}.html`), out);
        const expected = path.join(paths.expectations, `png/css.html${testConfig.namespace}.png`);

        await expect(preview).toBeVisuallyCorrectAsHTMLTo(expected);
      });
    });
  });
});
