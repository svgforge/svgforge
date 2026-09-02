
import path from 'node:path';
import {globSync} from 'glob';
import SVGSpriter from '../../../lib/svg-sprite.js';
import {addFixtureFiles} from '../../helpers/add-files.js';
import {paths} from '../../helpers/constants.js';
import removeTmpPath from '../../helpers/remove-temp-path.js';
import {
  beforeAll,
  describe,
  expect,
  it,
} from '../../helpers/jest-compat.js';

const cwd = path.join(paths.fixtures, 'svg/single');
const weather = globSync('**/weather*.svg', {cwd});

const temporaryPath = path.join(paths.tmp, 'rerun');

describe('testing rerun', () => {
  beforeAll(removeTmpPath.bind(null, temporaryPath));

  it('creates 5 files and then additional 1 on each layout after rerun when all render types disabled', async () => {
    expect.assertions(11);

    const spriter = new SVGSpriter({dest: temporaryPath});

    addFixtureFiles(spriter, weather, cwd);

    const {result: firstResult} = await spriter.compileAsync({
      css: {
        sprite: 'svg/css.vertical.svg',
        layout: 'vertical',
        dimensions: true,
        render: {
          css: true,
          scss: true,
        },
      },
    });

    expect(firstResult.css).toBeInstanceOf(Object);
    expect(Object.values(firstResult.css)).toHaveLength(3);

    const otherLayouts = ['horizontal', 'diagonal', 'packed'];

    const promises = otherLayouts.map(mode => new Promise(resolve => {
      spriter.compile({
        css: {
          sprite: `svg/css.${mode}.svg`,
          layout: 'horizontal',
        },
      }, (error, result) => {
        expect(error).toBeNull();
        expect(result.css).toBeInstanceOf(Object);
        expect(Object.values(result.css)).toHaveLength(1);

        resolve();
      });
    }));

    await Promise.all(promises);
  });
});
