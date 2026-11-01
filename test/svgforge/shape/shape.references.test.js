import {Buffer} from 'node:buffer';
import assert from 'node:assert/strict';
import {describe, it, mock} from 'node:test';
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
  path: 'test_path',
  base: '/test_base/',
  cwd: '/',
});

const makeShape = () => createShape(TEST_FILE, TEST_SPRITER);

describe('testing _replaceIdAndClassnameReferences()', () => {
  it('should replace ids if subs ids passed', () => {
    const shape = makeShape();
    const TEST_STRING = 'url(id1) url(id2)';
    const TEST_SUBS_IDS = {
      id1: 'NEW ID 1',
    };

    assert.strictEqual(shape._replaceIdAndClassnameReferences(TEST_STRING, TEST_SUBS_IDS, {}, false), 'url(#NEW ID 1) url(id2)');
  });

  it('should not change string if subs ids is null', () => {
    const shape = makeShape();
    const TEST_STRING = 'url(id1) url(id2)';

    assert.strictEqual(shape._replaceIdAndClassnameReferences(TEST_STRING, null, {}, false), TEST_STRING);
  });

  it('should substitute ids and class names in CSS selectors if selectors passed', () => {
    const shape = makeShape();
    const TEST_STRING = '.cls a#id { color: blue }';
    const TEST_SUBS_IDS = {'#id': 'NEW-ID'};
    const TEST_SUBS_CLASSNAMES = {'.cls': 'new-cls'};

    assert.strictEqual(shape._replaceIdAndClassnameReferences(TEST_STRING, TEST_SUBS_IDS, TEST_SUBS_CLASSNAMES, true), '.new-cls a#NEW-ID { color: blue }');
  });
});

describe('testing _replaceIdAndClassnameReferencesInCssSelectors()', () => {
  it('should substitute ids in CSS selectors', () => {
    const shape = makeShape();
    const TEST_STRING = 'a#id, #id:hover { color: blue }';
    const TEST_SUBS_IDS = {'#id': 'new-id'};

    assert.strictEqual(shape._replaceIdAndClassnameReferencesInCssSelectors(TEST_STRING, TEST_SUBS_IDS, {}), 'a#new-id, #new-id:hover { color: blue }');
  });

  it('should substitute class names in CSS selectors, longest first', () => {
    const shape = makeShape();
    const TEST_STRING = '.icon, .icon-large { color: blue }';
    const TEST_SUBS_CLASSNAMES = {'.icon': 'i', '.icon-large': 'i-lg'};

    assert.strictEqual(shape._replaceIdAndClassnameReferencesInCssSelectors(TEST_STRING, {}, TEST_SUBS_CLASSNAMES), '.i, .i-lg { color: blue }');
  });

  it('should substitute ids and class names in @media selector lists', () => {
    const shape = makeShape();
    const TEST_STRING = '@media screen { a#id.cls { color: blue } }';
    const TEST_SUBS_IDS = {'#id': 'new-id'};
    const TEST_SUBS_CLASSNAMES = {'.cls': 'new-cls'};

    assert.strictEqual(shape._replaceIdAndClassnameReferencesInCssSelectors(TEST_STRING, TEST_SUBS_IDS, TEST_SUBS_CLASSNAMES), '@media screen { a#new-id.new-cls { color: blue } }');
  });

  it('should leave @font-face and @keyframes selectors untouched', () => {
    const shape = makeShape();
    const TEST_STRING = '@font-face{font-family:x;src:url(a.woff)}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
    const TEST_SUBS_IDS = {'#id': 'new-id'};
    const TEST_SUBS_CLASSNAMES = {'.cls': 'new-cls'};

    assert.strictEqual(shape._replaceIdAndClassnameReferencesInCssSelectors(TEST_STRING, TEST_SUBS_IDS, TEST_SUBS_CLASSNAMES), TEST_STRING);
  });

  it('should leave attribute selectors untouched', () => {
    const shape = makeShape();
    const TEST_STRING = 'a[href="#anchor"] { color: blue }';
    const TEST_SUBS_IDS = {'#anchor': 'new-anchor'};

    assert.strictEqual(shape._replaceIdAndClassnameReferencesInCssSelectors(TEST_STRING, TEST_SUBS_IDS, {}), TEST_STRING);
  });
});
