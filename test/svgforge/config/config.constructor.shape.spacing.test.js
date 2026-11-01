
import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import SVGSpriterConfig from '../../../lib/svgforge/config.js';

describe('testing SVGSpriterConfig shape.spacing', () => {
  const DEFAULT_SPACING = {
    padding: {
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
    },
  };

  it('should copy config.shape.spacing', () => {
    const TEST_SPACING = {TEST_1: 1, TEST_2: 2};
    const config = new SVGSpriterConfig({shape: {spacing: TEST_SPACING}});

    assert.strictEqual(config.shape.spacing, TEST_SPACING);
  });

  it('should set default object if passed falsy value', () => {
    const config = new SVGSpriterConfig({shape: {spacing: false}});

    assert.deepStrictEqual(config.shape.spacing, DEFAULT_SPACING);
  });

  it('should set default object if spacing is not provided', () => {
    const config = new SVGSpriterConfig({shape: {}});

    assert.deepStrictEqual(config.shape.spacing, DEFAULT_SPACING);
  });

  it('should set object accordingly to the provided spacing', () => {
    const config = new SVGSpriterConfig({shape: {spacing: {padding: 1}}});

    assert.deepStrictEqual(config.shape.spacing, {
      padding: {
        top: 1,
        left: 1,
        bottom: 1,
        right: 1,
      },
    });
  });

  it('should set object with zeros if provided spacing is incorrect', () => {
    const config = new SVGSpriterConfig({shape: {spacing: {padding: ''}}});

    assert.deepStrictEqual(config.shape.spacing, DEFAULT_SPACING);
  });

  it('should set object with zeros if provided spacing is filled with negative values', () => {
    const config = new SVGSpriterConfig({shape: {spacing: {padding: -10}}});

    assert.deepStrictEqual(config.shape.spacing, DEFAULT_SPACING);
  });

  it('should set parse the integer from provided spacing', () => {
    const config = new SVGSpriterConfig({shape: {spacing: {padding: '10'}}});

    assert.deepStrictEqual(config.shape.spacing, {
      padding: {
        top: 10,
        left: 10,
        bottom: 10,
        right: 10,
      },
    });
  });

  describe('if provided spacing is array', () => {
    it('should set padding with same values if provided spacing has 1 element', () => {
      const config = new SVGSpriterConfig({shape: {spacing: {padding: [10]}}});

      assert.deepStrictEqual(config.shape.spacing, {
        padding: {
          top: 10,
          left: 10,
          bottom: 10,
          right: 10,
        },
      });
    });

    it('should set padding with x | y values if provided spacing has 2 elements', () => {
      const config = new SVGSpriterConfig({shape: {spacing: {padding: [10, 5]}}});

      assert.deepStrictEqual(config.shape.spacing, {
        padding: {
          top: 10,
          left: 5,
          bottom: 10,
          right: 5,
        },
      });
    });

    it('should set padding with mirrored x values if provided spacing has 3 element', () => {
      const config = new SVGSpriterConfig({shape: {spacing: {padding: [10, 5, 3]}}});

      assert.deepStrictEqual(config.shape.spacing, {
        padding: {
          top: 10,
          left: 5,
          bottom: 3,
          right: 5,
        },
      });
    });

    it('should set padding with all the values if provided spacing has 4 and more elements', () => {
      const config = new SVGSpriterConfig({shape: {spacing: {padding: [10, 5, 3, 2]}}});

      assert.deepStrictEqual(config.shape.spacing, {
        padding: {
          top: 10,
          left: 2,
          bottom: 3,
          right: 5,
        },
      });
    });

    it('should set padding with zeros if provided spacing has negative elements', () => {
      const config = new SVGSpriterConfig({shape: {spacing: {padding: [-10, -5, -3, -2]}}});

      assert.deepStrictEqual(config.shape.spacing, DEFAULT_SPACING);
    });
  });
});
