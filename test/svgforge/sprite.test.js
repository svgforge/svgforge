
import {Buffer} from 'node:buffer';
import assert from 'node:assert/strict';
import {describe, it, mock} from 'node:test';
import {isDeepStrictEqual} from 'node:util';
import SpriteFile from '../../lib/svgforge/file.js';
import SVGSprite from '../../lib/svgforge/sprite.js';

describe('testing SVGSprite', () => {
  describe('testing initial settings', () => {
    it('should set initial attributes', t => {
      const TEST_TRANSFORM = [t.mock.fn()];
      const sprite = new SVGSprite('', '', {}, false, TEST_TRANSFORM);

      assert.strictEqual(sprite.transform, TEST_TRANSFORM);
      assert.deepStrictEqual(sprite.content, []);
      assert.strictEqual(sprite._serialized, null);

      assert.strictEqual(sprite.DEFAULT_SVG_NAMESPACE, 'http://www.w3.org/2000/svg');
      assert.strictEqual(sprite.XLINK_NAMESPACE, 'http://www.w3.org/1999/xlink');
    });

    it('should set xmlDeclaration', t => {
      const TEST_XML_DECLARATION = 'xml';
      const sprite = new SVGSprite(TEST_XML_DECLARATION, '', {}, false, []);

      assert.strictEqual(sprite.xmlDeclaration, TEST_XML_DECLARATION);
    });

    it('should set empty xmlDeclaration', t => {
      const sprite = new SVGSprite(false, '', {}, false, []);

      assert.strictEqual(sprite.xmlDeclaration, '');
    });

    it('should set doctypeDeclaration', t => {
      const TEST_DOCTYPE_DECLARATION = 'doctype';
      const sprite = new SVGSprite('', TEST_DOCTYPE_DECLARATION, {}, false, []);

      assert.strictEqual(sprite.doctypeDeclaration, TEST_DOCTYPE_DECLARATION);
    });

    it('should set empty doctypeDeclaration', t => {
      const sprite = new SVGSprite(false, false, {}, false, []);

      assert.strictEqual(sprite.doctypeDeclaration, '');
    });

    it('should add namespaces', t => {
      const sprite = new SVGSprite(false, false, {}, true, []);

      assert.strictEqual(sprite.rootAttributes.xmlns, sprite.DEFAULT_SVG_NAMESPACE);
      assert.strictEqual(sprite.rootAttributes['xmlns:xlink'], sprite.XLINK_NAMESPACE);
    });

    it('should not add namespaces', t => {
      const sprite = new SVGSprite(false, false, {}, false, []);

      assert.ok(!Object.hasOwn(sprite.rootAttributes, 'xmlns'));
      assert.ok(!Object.hasOwn(sprite.rootAttributes, 'xmlns:xlink'));
    });
  });

  describe('testing add()', () => {
    it('should push to content if array is passed', t => {
      const TEST_CONTENT = ['<svg/>'];
      const sprite = new SVGSprite(false, false, {}, false, []);

      sprite.add(TEST_CONTENT);

      assert.deepStrictEqual(sprite.content, TEST_CONTENT);
      assert.strictEqual(sprite._serialized, null);
    });

    for (const parameter of [false, true, {}, mock.fn(), Symbol(''), 1, null, undefined, 'string']) { // eslint-disable-line node-test/prefer-context-mock -- module-scope mock
      it(`should not push to content if ${String(parameter)} passed`, () => {
        const sprite = new SVGSprite(false, false, {}, false, []);

        sprite.add(parameter);

        assert.deepStrictEqual(sprite.content, [parameter]);
        assert.strictEqual(sprite._serialized, null);
      });
    }
  });

  describe('testing toString()', () => {
    it('should return serialized content', t => {
      const TEST_CONTENT = 'test content';
      const sprite = new SVGSprite(false, false, {}, false, []);

      sprite._serialized = TEST_CONTENT;

      assert.strictEqual(sprite.toString(), TEST_CONTENT);
    });

    it('should serialize according to rootAttributes', t => {
      const TEST_ROOT_ATTRS = {ATTR_1: 1, ATTR_2: 2};
      const sprite = new SVGSprite(false, false, TEST_ROOT_ATTRS, false, []);
      sprite.content = ['content'];
      const expected = `<svg ATTR_1="1" ATTR_2="2">${sprite.content[0]}</svg>`;

      assert.strictEqual(sprite.toString(), expected);
      assert.strictEqual(sprite._serialized, expected);
    });

    it('should escape special characters in root attributes', t => {
      const sprite = new SVGSprite(false, false, {title: 'A&B <tag> "q" \'s\''}, false, []);
      sprite.content = ['content'];
      const expected = '<svg title="A&amp;B &lt;tag&gt; &quot;q&quot; &#39;s&#39;">content</svg>';

      assert.strictEqual(sprite.toString(), expected);
    });

    it('should transform svg in series', t => {
      const TEST_TRANSFORM = [t.mock.fn(() => (false)), t.mock.fn(() => ('TEST'))];
      const sprite = new SVGSprite(false, false, {}, false, TEST_TRANSFORM);
      const expected = 'TEST';

      assert.strictEqual(sprite.toString(), expected);
      assert.strictEqual(sprite._serialized, expected);

      assert.ok(TEST_TRANSFORM[0].mock.calls.some(call => isDeepStrictEqual(call.arguments, ['<svg></svg>'])), 'expected a matching call');
      assert.ok(TEST_TRANSFORM[1].mock.calls.some(call => isDeepStrictEqual(call.arguments, [''])), 'expected a matching call');
    });
  });

  describe('testing toFile()', () => {
    it('should return file', t => {
      const TEST_CONTENT = 'TEST';
      const TEST_BASE = 'TEST_BASE';
      const TEST_PATH = 'TEST_PATH';
      const sprite = new SVGSprite(false, false, {}, false, []);
      t.mock.method(sprite, 'toString').mock.mockImplementationOnce(() => (TEST_CONTENT));

      assert.deepStrictEqual(sprite.toFile(TEST_BASE, TEST_PATH), new SpriteFile({
        base: TEST_BASE,
        path: TEST_PATH,
        contents: Buffer.from(TEST_CONTENT),
      }));
    });
  });
});
