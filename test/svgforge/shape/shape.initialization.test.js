
import {Buffer} from 'node:buffer';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {
  beforeEach,
  describe,
  it,
  mock,
} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import File from 'vinyl';
import getShape from '../../../lib/svgforge/shape/index.js';
import SVGSpriter from '../../../lib/svgforge.js';
import {dependencyKeys, setDependency} from '../../../lib/deps.js';
import ArgumentError from '../../../lib/svgforge/errors/argument-error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mockFixXMLString = mock.fn();
setDependency(dependencyKeys.fixXmlString, mockFixXMLString);

const TEST_SVG = `<svg viewBox="0 0
                                16 16"></svg>`;
const FIXED_TEST_SVG = '<svg viewBox="0 0 16 16"></svg>';

describe('testing SVGShape initialization', () => {
  let spriter;

  beforeEach(() => {
    mockFixXMLString.mock.resetCalls();
    spriter = new SVGSpriter({
      shape: {
        dest: 'svg',
      },
    });
  });

  it('should not throw an error and should call fixXMLString if fixXMLString is not throwing error', () => {
    mockFixXMLString.mock.mockImplementationOnce(() => (FIXED_TEST_SVG));

    getShape(new File({
      path: __dirname,
      contents: Buffer.from(TEST_SVG),
    }), spriter);
    assert.ok(mockFixXMLString.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_SVG])), 'expected a matching call');
  });

  it('should throw error and should call fixXMLString if fixXMLString is throwing error', () => {
    mockFixXMLString.mock.mockImplementation(() => {
      throw new Error('some error');
    });

    assert.throws(() => {
      getShape(new File({
        path: __dirname,
        contents: Buffer.from(TEST_SVG),
      }), spriter);
    }, new ArgumentError('Invalid SVG file (some error)'));
    assert.ok(mockFixXMLString.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_SVG])), 'expected a matching call');
  });

  it('should throw an error and should call fixXMLString on non-svg files', () => {
    const TEST_NON_SVG = '<div class="test">123</div>';

    assert.throws(() => {
      getShape(new File({
        path: __dirname,
        contents: Buffer.from(TEST_NON_SVG),
      }), spriter);
    }, ArgumentError);
    assert.ok(mockFixXMLString.mock.calls.some(call => isDeepStrictEqual(call.arguments, [TEST_NON_SVG])), 'expected a matching call');
  });

  it('should not throw an error and should not call fixXMLString on actual valid svg files', () => {
    const cwd = path.join(__dirname, '../../fixture/svg/single');
    const weatherFiles = fs.globSync('**/weather*.svg', {cwd}).toSorted((a, b) => b.localeCompare(a));

    for (const weatherFile of weatherFiles) {
      const svgFileBuffer = fs.readFileSync(path.join(cwd, weatherFile));

      getShape(new File({
        path: __dirname,
        contents: svgFileBuffer,
      }), spriter);
    }

    assert.strictEqual(mockFixXMLString.mock.callCount(), 0);
  });
});
