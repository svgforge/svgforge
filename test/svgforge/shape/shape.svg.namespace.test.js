import {Buffer} from 'node:buffer';
import assert from 'node:assert/strict';
import {describe, it, mock} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import {DOMParser} from '@xmldom/xmldom';
import File from 'vinyl';
import createShape from '../../../lib/svgforge/shape/index.js';
import NotPermittedError from '../../../lib/svgforge/errors/not-permitted-error.js';
import {dependencyKeys, setDependency} from '../../../lib/deps.js';

const mockMinifyBlock = mock.fn(() => ({css: ''}));
setDependency(dependencyKeys.csso, {minifyBlock: mockMinifyBlock});

const TEST_SPRITER = {
  config: {
    shape: {
      meta: {},
      align: {},
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

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';

const parse = svg => new DOMParser().parseFromString(svg, 'image/svg+xml');

describe('testing setNamespace()', () => {
  /**
   Creates a configured SVGShape for namespace testing.
   @param {boolean} addNamespaceIds shape.spriter.config.svg.namespaceIDs
   @param {boolean} isNamespaced shape._namespaced
   @param {boolean} addNamespaceClassnames shape.spriter.config.svg.namespaceClassnames
   @returns {object} SVGShape
   */
  const makeShape = (addNamespaceIds, isNamespaced, addNamespaceClassnames) => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);

    shape.spriter.config.svg.namespaceIDs = addNamespaceIds;
    shape.spriter.config.svg.namespaceClassnames = addNamespaceClassnames;
    shape._namespaced = isNamespaced;
    shape.svg.ready = '<svg/>';
    return shape;
  };

  it('should raise error if shape is not ready', () => {
    const shape = makeShape(true, false, true);
    shape.svg.ready = false;

    assert.throws(() => {
      shape.setNamespace({});
    }, new NotPermittedError('Shape namespace cannot be set before complementing'));
  });

  describe('if namespaceIds', () => {
    it('should namespace all IDs and substitute ID references', () => {
      const shape = makeShape(true, false, false);
      mock.method(shape, '_replaceIdAndClassnameReferences').mock.mockImplementation(value => value);
      const TEST_NAMESPACE = 'test-namespace';
      shape.dom = parse(`<svg xmlns="${SVG_NAMESPACE}" xmlns:xlink="${XLINK_NAMESPACE}" aria-labelledby="a test">
        <g id="a"><use href="#a"/><use href="data:keep"/><path fill="#a"/><use xlink:href="#a"/><use xlink:href="data:also-keep"/></g>
        <style>x{}</style>
      </svg>`);

      shape.setNamespace(TEST_NAMESPACE);

      // eslint-disable-next-line unicorn/prefer-query-selector -- `@xmldom/xmldom` provides no `querySelector` API.
      const g = shape.dom.getElementsByTagName('g')[0];
      // eslint-disable-next-line unicorn/prefer-query-selector -- `@xmldom/xmldom` provides no `querySelectorAll` API.
      const uses = shape.dom.getElementsByTagName('use');
      // eslint-disable-next-line unicorn/prefer-query-selector -- `@xmldom/xmldom` provides no `querySelector` API.
      const path = shape.dom.getElementsByTagName('path')[0];

      assert.strictEqual(g.getAttribute('id'), `${TEST_NAMESPACE}a`);
      assert.strictEqual(uses[0].getAttribute('href'), `#${TEST_NAMESPACE}a`);
      assert.strictEqual(uses[1].getAttribute('href'), 'data:keep');
      assert.strictEqual(path.getAttribute('fill'), '#a');
      assert.strictEqual(uses[2].getAttribute('href'), `#${TEST_NAMESPACE}a`);
      assert.strictEqual(uses[2].getAttributeNS(XLINK_NAMESPACE, 'href'), null);
      assert.strictEqual(uses[3].getAttribute('href'), null);
      assert.strictEqual(uses[3].getAttributeNS(XLINK_NAMESPACE, 'href'), 'data:also-keep');
      assert.strictEqual(shape.dom.documentElement.getAttribute('aria-labelledby'), `${TEST_NAMESPACE}a test`);
      assert.strictEqual(shape._namespaced, true);

      assert.ok(mockMinifyBlock.mock.calls.some(call => isDeepStrictEqual(call.arguments, ['x{}', {restructure: false}])), 'expected a matching call');
    });
  });

  describe('with namespaceClassnames', () => {
    it('should namespace all class names', () => {
      const shape = makeShape(false, false, true);
      mock.method(shape, '_replaceIdAndClassnameReferences').mock.mockImplementation(() => undefined);
      const TEST_NAMESPACE = 'ns';
      shape.dom = parse(`<svg xmlns="${SVG_NAMESPACE}"><g class="1 2 3 4 5  6 "/></svg>`);

      shape.setNamespace(TEST_NAMESPACE);

      // eslint-disable-next-line unicorn/prefer-query-selector -- `@xmldom/xmldom` provides no `querySelector` API.
      const g = shape.dom.getElementsByTagName('g')[0];
      assert.strictEqual(g.getAttribute('class'), `${TEST_NAMESPACE}1 ${TEST_NAMESPACE}2 ${TEST_NAMESPACE}3 ${TEST_NAMESPACE}4 ${TEST_NAMESPACE}5 ${TEST_NAMESPACE}6`);
      assert.strictEqual(shape._namespaced, true);
    });
  });

  it('should return early if already namespaced', () => {
    const shape = makeShape(true, true, true);

    shape.setNamespace('123');

    assert.strictEqual(shape._namespaced, true);
  });

  it('should convert xlink:href attributes even without namespaceIds and namespaceClassnames', () => {
    const shape = makeShape(false, false, false);
    shape.dom = parse(`<svg xmlns="${SVG_NAMESPACE}" xmlns:xlink="${XLINK_NAMESPACE}"><use xlink:href="#id"/></svg>`);

    shape.setNamespace('123');

    // eslint-disable-next-line unicorn/prefer-query-selector -- `@xmldom/xmldom` provides no `querySelector` API.
    const use = shape.dom.getElementsByTagName('use')[0];
    assert.strictEqual(use.getAttribute('href'), '#id');
    assert.strictEqual(use.getAttributeNS(XLINK_NAMESPACE, 'href'), null);
    assert.strictEqual(shape._namespaced, true);
  });
});

describe('testing resetNamespace()', () => {
  it('should not change _namespaced if it is already not namespaced', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    shape._namespaced = false;
    shape.resetNamespace();

    assert.strictEqual(shape._namespaced, false);
  });

  it('should not change _namespaced if this.spriter.config.svg.namespaceIDs is falsy', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    shape.spriter.config.svg.namespaceIDs = false;
    shape._namespaced = true;
    shape.resetNamespace();

    assert.strictEqual(shape._namespaced, true);
  });

  it('should change _namespaced if it is namespaced and this.spriter.config.svg.namespaceIDs is truthy', () => {
    const shape = createShape(TEST_FILE, TEST_SPRITER);
    shape.spriter.config.svg.namespaceIDs = true;
    shape._namespaced = true;
    shape.svg.ready = TEST_FILE.contents.toString();
    shape.resetNamespace();

    assert.strictEqual(shape._namespaced, false);
  });
});
