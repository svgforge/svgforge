
import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import SVGSpriterConfig from '../../../lib/svgforge/config.js';

describe('testing SVGSpriterConfig shape.transforms', () => {
  const DEFAULT_TRANSFORMS = [['svgo', {}]];

  it('should set exact array passed', t => {
    const TEST_TRANSFORMS = [];
    const config = new SVGSpriterConfig({shape: {transform: TEST_TRANSFORMS}});

    assert.deepStrictEqual(config.shape.transform, TEST_TRANSFORMS);
  });

  it('should set default transforms if not provided', t => {
    const config = new SVGSpriterConfig({shape: {}});

    assert.deepStrictEqual(config.shape.transform, DEFAULT_TRANSFORMS);
  });

  it('should set default transforms if provided transform is null', t => {
    const config = new SVGSpriterConfig({shape: {transform: null}});

    assert.deepStrictEqual(config.shape.transform, DEFAULT_TRANSFORMS);
  });

  it('should set empty array if passed transforms is not correct', t => {
    const config = new SVGSpriterConfig({shape: {transform: [true]}});

    assert.deepStrictEqual(config.shape.transform, []);
  });

  it('should set expected array if transforms is an array of strings', t => {
    const TEST_TRANSFORMS = [
      'test',
      'test_2',
    ];
    const TEST_TRANSFORMS_COPY = [...TEST_TRANSFORMS];
    const config = new SVGSpriterConfig({shape: {transform: TEST_TRANSFORMS}});

    assert.deepStrictEqual(config.shape.transform, [
      [TEST_TRANSFORMS_COPY[0], {}],
      [TEST_TRANSFORMS_COPY[1], {}],
    ]);
  });

  it('should set expected custom array of transforms if transforms is an array of functions', t => {
    const TEST_TRANSFORMS = [
      t.mock.fn(),
      t.mock.fn(),
    ];
    const TEST_TRANSFORMS_COPY = [...TEST_TRANSFORMS];
    const config = new SVGSpriterConfig({shape: {transform: TEST_TRANSFORMS}});

    assert.deepStrictEqual(config.shape.transform, [
      ['custom', TEST_TRANSFORMS_COPY[0]],
      ['custom', TEST_TRANSFORMS_COPY[1]],
    ]);
  });

  it('should set expected array of transforms if transforms is an object', t => {
    const TEST_TRANSFORM_CONFIG = {TEST: 2};
    const TEST_TRANSFORMS = [{
      TEST: t.mock.fn(),
      TEST_THAT_SHOULD_NOT_INCLUDED: t.mock.fn(),
    }, {
      TEST_2: TEST_TRANSFORM_CONFIG,
    }];
    const TEST_TRANSFORMS_COPY = [...TEST_TRANSFORMS];
    const config = new SVGSpriterConfig({shape: {transform: TEST_TRANSFORMS}});

    assert.deepStrictEqual(config.shape.transform, [
      ['TEST', TEST_TRANSFORMS_COPY[0].TEST],
      ['TEST_2', TEST_TRANSFORM_CONFIG],
    ]);
  });
});
