
import {Buffer} from 'node:buffer';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {describe, it, mock} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import {DOMParser} from '@xmldom/xmldom';
import SVGSpriter from '../../lib/svgforge.js';
import {dependencyKeys, setDependency} from '../../lib/deps.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mockCalc = mock.fn();
setDependency(dependencyKeys.svgDimensions, mockCalc);

const expectations = [{
  svg: '46x46.svg',
  result: {
    width: 46,
    height: 46,
  },
}, {
  svg: '2048x2048.svg',
  result: {
    width: 2048,
    height: 2048,
  },
}];

const TEST_SVG = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

describe('testing shapes', () => {
  for (const {svg, dimension} of [
    {svg: expectations[0].svg, dimension: expectations[0].result},
    {svg: expectations[1].svg, dimension: expectations[1].result},
  ]) {
    it(`should call calculateSvgDimensions if the ${svg} does not contain viewBox or height/width properties`, async () => {
      const spriter = new SVGSpriter({
        shape: {
          dest: 'svg',
          dimension: {
            maxWidth: 4000,
            maxHeight: 4000,
          },
        },
      });

      mockCalc.mock.mockImplementationOnce(() => (dimension));

      const svgFilePath = path.join(__dirname, `../fixture/svg/special/without-dims/${svg}`);

      spriter.add(svgFilePath, svg, Buffer.from(TEST_SVG));

      const {result} = await spriter.compileAsync();

      // Shape transformations may complete asynchronously (e.g. worker-thread
      // optimization), so assert on the dimension call only after processing.
      const expectedSvg = new DOMParser().parseFromString(`<?xml version="1.0" encoding="utf-8"?>${TEST_SVG}`, 'image/svg+xml').toString();
      assert.ok(mockCalc.mock.calls.some(call => isDeepStrictEqual(call.arguments, [expectedSvg])), 'expected a matching call');
      assert.ok(result instanceof Object);
      assert.ok(Array.isArray(result.shapes));

      const dom = new DOMParser().parseFromString(result.shapes[0]._contents.toString(), 'text/xml');

      assert.strictEqual(dom.documentElement.getAttribute('height'), dimension.height.toString());
      assert.strictEqual(dom.documentElement.getAttribute('width'), dimension.width.toString());
    });
  }

  it('should skip a shape whose dimensions cannot be calculated instead of emitting NaN viewBox values', async () => {
    const spriter = new SVGSpriter({
      shape: {
        dest: 'svg',
        dimension: {
          maxWidth: 4000,
          maxHeight: 4000,
        },
      },
    });

    mockCalc.mock.mockImplementationOnce(() => {
      throw new Error('Dimension calculation failed');
    });

    const svgFilePath = path.join(__dirname, '../fixture/svg/special/without-dims/46x46.svg');
    spriter.add(svgFilePath, '46x46.svg', Buffer.from(TEST_SVG));

    const {result} = await spriter.compileAsync();

    assert.ok(result instanceof Object);
    assert.deepStrictEqual(result.shapes, []);
  });
});
