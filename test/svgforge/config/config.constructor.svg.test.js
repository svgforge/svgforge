
import assert from 'node:assert/strict';
import {describe, it, mock} from 'node:test';
import SVGSpriterConfig from '../../../lib/svgforge/config.js';

describe('testing svg SVGSpriterConfig.constructor', () => {
  it('should merge config.svg', () => {
    const TEST_SVG = {TEST: 1, TEST_2: 2};
    const config = new SVGSpriterConfig({svg: TEST_SVG});

    assert.partialDeepStrictEqual(config.svg, TEST_SVG);
  });

  it('should set default object if provided falsy value', () => {
    const DEFAULT_SVG_CONFIG = {
      doctypeDeclaration: true,
      xmlDeclaration: true,
      namespaceIDs: true,
      namespaceIDPrefix: '',
      namespaceClassnames: true,
      dimensionAttributes: true,
      rootAttributes: {},
    };

    const config = new SVGSpriterConfig({svg: false});

    assert.partialDeepStrictEqual(config.svg, DEFAULT_SVG_CONFIG);
  });

  for (const field of ['xmlDeclaration', 'doctypeDeclaration', 'dimensionAttributes']) {
    describe(`testing ${field} attr`, () => {
      it('should set the passed value', () => {
        const TEST_VAR = 'test-var';
        const config = new SVGSpriterConfig({svg: {[field]: TEST_VAR}});

        assert.strictEqual(config.svg[field], TEST_VAR);
      });

      it('should set to true if not provided', () => {
        const config = new SVGSpriterConfig({});

        assert.strictEqual(config.svg[field], true);
      });

      it('should set to false if falsy value provided', () => {
        const config = new SVGSpriterConfig({svg: {[field]: false}});

        assert.strictEqual(config.svg[field], false);
      });
    });
  }

  it('should set rootAttributes with passed value', () => {
    const TEST_VAR = 'test-var';
    const config = new SVGSpriterConfig({svg: {rootAttributes: TEST_VAR}});

    assert.strictEqual(config.svg.rootAttributes, TEST_VAR);
  });

  it('should set rootAttributes to {} if not provided', () => {
    const config = new SVGSpriterConfig({});

    assert.deepStrictEqual(config.svg.rootAttributes, {});
  });

  it('should set rootAttributes to {} if falsy value provided', () => {
    const config = new SVGSpriterConfig({svg: {rootAttributes: false}});

    assert.deepStrictEqual(config.svg.rootAttributes, {});
  });

  describe('testing svg.transform', () => {
    it('should set empty array if not provided', () => {
      const config = new SVGSpriterConfig({});

      assert.deepStrictEqual(config.svg.transform, []);
    });

    it('should fill with functions if provided', () => {
      const TEST_TRANSFORMS = [mock.fn(), mock.fn()];
      const config = new SVGSpriterConfig({svg: {transform: TEST_TRANSFORMS}});

      assert.deepStrictEqual(config.svg.transform, TEST_TRANSFORMS);
    });

    it('should set empty array if incorrect config provided', () => {
      const TEST_TRANSFORMS = [1, 'test'];
      const config = new SVGSpriterConfig({svg: {transform: TEST_TRANSFORMS}});

      assert.deepStrictEqual(config.svg.transform, []);
    });

    it('should set array of provided function', () => {
      const TEST_TRANSFORM = mock.fn();
      const config = new SVGSpriterConfig({svg: {transform: TEST_TRANSFORM}});

      assert.deepStrictEqual(config.svg.transform, [TEST_TRANSFORM]);
    });

    it('should throw an error if wrong type is passed', () => {
      assert.throws(() => {
        // eslint-disable-next-line no-new
        new SVGSpriterConfig({svg: {transform: 42}});
      }, TypeError);
    });
  });
});
