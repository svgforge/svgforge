
import {Buffer} from 'node:buffer';
import assert from 'node:assert/strict';
import {describe, it, mock} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import File from 'vinyl';
import {XMLSerializer} from '@xmldom/xmldom';
import createShape from '../../../lib/svgforge/shape/index.js';

const TEST_SPRITER = {
  config: {
    shape: {
      meta: {},
    },
    svg: {
      doctypeDeclaration: '',
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

describe('testing getSVG()', () => {
  it('should clone the node', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    mock.method(shape.dom.documentElement, 'cloneNode');

    shape.getSVG();

    assert.ok(shape.dom.documentElement.cloneNode.mock.calls.some(call => isDeepStrictEqual(call.arguments, [true])), 'expected a matching call');
  });

  it('should return serialized string with declarations if inline is true', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const TEST_NODE = shape.dom.createElementNS(shape.DEFAULT_SVG_NAMESPACE, 'svg');
    mock.method(shape, '_stripInlineNamespaceDeclarations').mock.mockImplementationOnce(() => (TEST_NODE));

    assert.strictEqual(shape.getSVG(true), new XMLSerializer().serializeToString(TEST_NODE));
  });

  it('should call transform if it is a function', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const testFn = mock.fn();

    shape.getSVG(false, testFn);

    assert.strictEqual(testFn.mock.callCount(), 1);
    assert.strictEqual(typeof testFn.mock.calls[0].arguments[0], 'object');
  });

  it('should return serialized xml if inline is true', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const TEST_NODE = shape.dom.createElementNS(shape.DEFAULT_SVG_NAMESPACE, 'svg');
    mock.method(shape, '_stripInlineNamespaceDeclarations').mock.mockImplementationOnce(() => (TEST_NODE));

    assert.strictEqual(shape.getSVG(true), new XMLSerializer().serializeToString(TEST_NODE));
  });

  it('should add declarations if provided', () => {
    const TEST_XML_DECLARATION = 'TEST XML DECLARATION';
    const TEST_DOCTYPE_DECLARATION = 'TEST DOCTYPE DECLARATION';
    const shape = createShape(TEST_FILE, {
      config: {
        shape: {
          meta: {},
        },
        svg: {
          doctypeDeclaration: true,
          xmlDeclaration: true,
        },
      },
      verbose: mock.fn(),
    });
    shape.doctypeDeclaration = TEST_DOCTYPE_DECLARATION;
    shape.xmlDeclaration = TEST_XML_DECLARATION;

    assert.ok(shape.getSVG().includes(TEST_DOCTYPE_DECLARATION));
    assert.ok(shape.getSVG().includes(TEST_XML_DECLARATION));
  });

  it('should substitute ID references in href attributes', () => {
    const shape = createShape(new File({
      base: TEST_FILE.base,
      path: TEST_FILE.path,
      cwd: TEST_FILE.cwd,
      contents: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" id="abc" height="0" width="0" viewBox="0 0 100 100"><use href="#abc"/></svg>'),
    }), {
      config: {
        shape: {
          meta: {},
        },
        svg: {
          doctypeDeclaration: '',
          namespaceIDPrefix: 'someprefix-',
          namespaceClassnames: false,
          namespaceIDs: true,
        },
        mode: {
          view: true,
        },
      },
      verbose: mock.fn(),
    });
    shape.complement(mock.fn());
    shape.setNamespace('ns-');

    assert.strictEqual(shape.getSVG(), '<svg xmlns="http://www.w3.org/2000/svg" id="someprefix-ns-abc" height="100" width="100" viewBox="0 0 100 100"><use href="#someprefix-ns-abc"/></svg>');
  });

  it('should substitute ID references in xlink:href attributes', () => {
    const shape = createShape(new File({
      base: TEST_FILE.base,
      path: TEST_FILE.path,
      cwd: TEST_FILE.cwd,
      contents: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="abc" height="0" width="0" viewBox="0 0 100 100"><use xlink:href="#abc"/></svg>'),
    }), {
      config: {
        shape: {
          meta: {},
        },
        svg: {
          doctypeDeclaration: '',
          namespaceIDPrefix: 'someprefix-',
          namespaceClassnames: false,
          namespaceIDs: true,
        },
        mode: {
          view: true,
        },
      },
      verbose: mock.fn(),
    });
    shape.complement(mock.fn());
    shape.setNamespace('ns-');

    assert.strictEqual(shape.getSVG(), '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="someprefix-ns-abc" height="100" width="100" viewBox="0 0 100 100"><use href="#someprefix-ns-abc"/></svg>');
  });
});

describe('testing _stripInlineNamespaceDeclarations()', () => {
  it('should deal with nsMap if passed', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const TEST_ELEMENT = {
      childNodes: [],
    };
    const testFn = mock.fn(() => (false));
    const MOCK_NS_MAP = {
      '': {},
      xlink: {},
    };

    Object.defineProperties(MOCK_NS_MAP, {
      '': {
        get: testFn,
      },
      xlink: {
        get: testFn,
      },
    });

    shape._stripInlineNamespaceDeclarations(TEST_ELEMENT, MOCK_NS_MAP);

    assert.strictEqual(testFn.mock.callCount(), 2);
  });

  it('should remove xmlns if it exists', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const TEST_ELEMENT = {
      attributes: {
        getNamedItem: mock.fn(() => ({value: shape.DEFAULT_SVG_NAMESPACE})),
        removeNamedItem: mock.fn(),
      },
      childNodes: [],
    };

    assert.strictEqual(shape._stripInlineNamespaceDeclarations(TEST_ELEMENT), TEST_ELEMENT);
    assert.ok(TEST_ELEMENT.attributes.getNamedItem.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['xmlns'])), 'expected a matching call');
    assert.ok(TEST_ELEMENT.attributes.removeNamedItem.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['xmlns'])), 'expected a matching call');
  });

  it('should remove xmlns:xlink if it not exists in nsMap', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const TEST_ELEMENT = {
      attributes: {
        getNamedItem: mock.fn(() => ({value: shape.XLINK_NAMESPACE})),
        removeNamedItem: mock.fn(),
      },
      childNodes: [],
    };

    assert.strictEqual(shape._stripInlineNamespaceDeclarations(TEST_ELEMENT, {}), TEST_ELEMENT);
    assert.ok(TEST_ELEMENT.attributes.getNamedItem.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['xmlns:xlink'])), 'expected a matching call');
    assert.ok(TEST_ELEMENT.attributes.removeNamedItem.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['xmlns:xlink'])), 'expected a matching call');
  });

  it('should remove xmlns:xlink if it exists in nsMap', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const TEST_ELEMENT = {
      attributes: {
        getNamedItem: mock.fn(() => ({value: shape.XLINK_NAMESPACE})),
        removeNamedItem: mock.fn(),
      },
      childNodes: [],
    };

    assert.strictEqual(shape._stripInlineNamespaceDeclarations(TEST_ELEMENT, {xlink: shape.XLINK_NAMESPACE}), TEST_ELEMENT);
    assert.ok(TEST_ELEMENT.attributes.getNamedItem.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['xmlns:xlink'])), 'expected a matching call');
    assert.ok(TEST_ELEMENT.attributes.removeNamedItem.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['xmlns:xlink'])), 'expected a matching call');
  });

  it('should call _stripInlineNamespaceDeclarations() for each child element', () => {
    let isMethodMocked = false;
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const TEST_CHILD_1 = {nodeType: 1};
    const TEST_CHILD_2 = {nodeType: 1};
    const TEST_CHILD_3 = {nodeType: 666};
    const TEST_ELEMENT = {
      _nsMap: {TEST_NS_MAP: true},
      attributes: {
        getNamedItem: mock.fn(() => ({value: shape.XLINK_NAMESPACE})),
        removeNamedItem: mock.fn(),
      },
      childNodes: {
        0: TEST_CHILD_1,
        1: TEST_CHILD_2,
        2: TEST_CHILD_3,
        length: 3,
        item(i) {
          if (!isMethodMocked) {
            isMethodMocked = true; // Mocking the other calls
            mock.method(shape, '_stripInlineNamespaceDeclarations').mock.mockImplementation(() => undefined);
          }

          return this[i];
        },
      },
    };

    shape._stripInlineNamespaceDeclarations(TEST_ELEMENT, false);

    assert.strictEqual(shape._stripInlineNamespaceDeclarations.mock.callCount(), 2);
    assert.deepStrictEqual(shape._stripInlineNamespaceDeclarations.mock.calls[0].arguments[0], TEST_CHILD_1);
    assert.partialDeepStrictEqual(shape._stripInlineNamespaceDeclarations.mock.calls[0].arguments[1], TEST_ELEMENT._nsMap);
    assert.deepStrictEqual(shape._stripInlineNamespaceDeclarations.mock.calls[1].arguments[0], TEST_CHILD_1);
    assert.partialDeepStrictEqual(shape._stripInlineNamespaceDeclarations.mock.calls[1].arguments[1], TEST_ELEMENT._nsMap);
  });
});

describe('testing setSVG()', () => {
  it('should set attributes to svg and call _initSVG()', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    const TEST_SVG = 'TEST_svg';
    const TEST_RESULT = {TEST: 'result'};

    mock.method(shape, '_initSVG').mock.mockImplementationOnce(() => (TEST_RESULT));

    assert.strictEqual(shape.setSVG(TEST_SVG), TEST_RESULT);
    assert.strictEqual(shape.svg.current, TEST_SVG);
    assert.strictEqual(shape.svg.ready, null);
    assert.ok(shape._initSVG.mock.calls.some(call => isDeepStrictEqual(call.arguments, [])), 'expected a matching call');
  });
});

describe('testing _round()', () => {
  it('should return expected result', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);

    shape._precision = 0.1;

    assert.strictEqual(shape._round(99.99), 100);

    shape._precision = 0.01;

    assert.strictEqual(shape._round(90), 100);

    shape._precision = 100;

    assert.strictEqual(shape._round(99.9), 99.9);
  });
});
