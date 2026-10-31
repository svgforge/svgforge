
import {Buffer} from 'node:buffer';
import assert from 'node:assert/strict';
import {describe, it, mock} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import File from 'vinyl';
import createShape from '../../../lib/svgforge/shape/index.js';

const TEST_SPRITER = {
  config: {
    shape: {
      meta: {},
      align: {},
    },
  },
  verbose: mock.fn(),
};
const TEST_FILE = new File({
  contents: Buffer.from('<svg></svg>'),
  path: '/test_base/test_path',
  base: '/test_base/',
  cwd: '/',
});

describe('testing getDimensions()', () => {
  it('should return expected width, height', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    shape.width = 100;
    shape.height = 200;

    assert.deepStrictEqual(shape.getDimensions(), {
      width: 100,
      height: 200,
    });
  });
});

describe('testing setDimensions()', () => {
  it('should set expected width, height', () => {
    const TEST_WIDTH = 200;
    const TEST_HEIGHT = 100;
    const shape = createShape(TEST_FILE, TEST_SPRITER);

    shape.setDimensions(TEST_WIDTH, TEST_HEIGHT);

    assert.strictEqual(shape.width, TEST_WIDTH);
    assert.strictEqual(shape.height, TEST_HEIGHT);
    assert.strictEqual(shape.dom.documentElement.getAttribute('width'), TEST_WIDTH.toString());
    assert.strictEqual(shape.dom.documentElement.getAttribute('height'), TEST_HEIGHT.toString());
  });
});

describe('testing getViewbox()', () => {
  it('should set viewbox if it has not', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    shape.viewBox = null;
    shape.width = null;
    shape.height = null;

    mock.method(shape, 'setViewbox').mock.mockImplementationOnce(() => ('TEST'));

    shape.getViewbox();

    assert.ok(shape.setViewbox.mock.calls.some(call => isDeepStrictEqual(call.arguments, [0, 0, null, null])), 'expected a matching call');
  });

  it('should set viewbox with provided values', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    shape.viewBox = null;
    shape.width = null;
    shape.height = null;

    mock.method(shape, 'setViewbox').mock.mockImplementationOnce(() => ('TEST'));

    shape.getViewbox(10, 200);

    assert.ok(shape.setViewbox.mock.calls.some(call => isDeepStrictEqual(call.arguments, [0, 0, 10, 200])), 'expected a matching call');
  });

  it('should should return viewBox', () => {
    const TEST_VIEWBOX = 'test viewbox';
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    shape.viewBox = TEST_VIEWBOX;

    assert.strictEqual(shape.getViewbox(), TEST_VIEWBOX);
  });
});

describe('testing setViewbox()', () => {
  it('should set accordingly if first param is array', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const expected = [0, 1, 2, 3, 4, 23, NaN];

    assert.deepStrictEqual(shape.setViewbox([0, 1, 2, 3, 4, '23', 'string']), expected);
    assert.deepStrictEqual(shape.viewBox, expected);
    assert.strictEqual(shape.dom.documentElement.getAttribute('viewBox'), expected.join(' '));
  });

  it('should fill with zeros if first param is empty array', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const expected = [0, 0, 0, 0];

    assert.deepStrictEqual(shape.setViewbox([]), expected);
    assert.deepStrictEqual(shape.viewBox, expected);
    assert.strictEqual(shape.dom.documentElement.getAttribute('viewBox'), expected.join(' '));
  });

  it('should accordingly to passed params', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const expected = [0, 1, 2, 3];

    assert.deepStrictEqual(shape.setViewbox(...expected), expected);
    assert.deepStrictEqual(shape.viewBox, expected);
    assert.strictEqual(shape.dom.documentElement.getAttribute('viewBox'), expected.join(' '));
  });
});
