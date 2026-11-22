import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import SVGSpriterConfig from '../../../lib/svgforge/config.js';

describe('config validation', () => {
  it('should throw for invalid shape type', () => {
    assert.throws(() => new SVGSpriterConfig({shape: []}), /"shape" option must be an object/u);
  });

  it('should throw for invalid shape.dedupe type', () => {
    assert.throws(() => new SVGSpriterConfig({shape: {dedupe: 'yes'}}), /"shape\.dedupe" option must be a boolean/u);
  });

  it('should throw for invalid shape.accessibility.autoTitle type', () => {
    assert.throws(
      () => new SVGSpriterConfig({shape: {accessibility: {autoTitle: 'yes'}}}),
      /"shape\.accessibility\.autoTitle" option must be a boolean/u,
    );
  });

  it('should throw for invalid shape subobject type', () => {
    assert.throws(() => new SVGSpriterConfig({shape: {spacing: []}}), /"shape\.spacing" option must be an object/u);
  });

  it('should throw for invalid shape.dimension value type', () => {
    assert.throws(
      () => new SVGSpriterConfig({shape: {dimension: {maxWidth: '2000'}}}),
      /"shape\.dimension\.maxWidth" option must be a number/u,
    );
  });

  it('should accept shape.transform as string', () => {
    const config = new SVGSpriterConfig({shape: {transform: 'svgo'}});
    assert.ok(Array.isArray(config.shape.transform));
  });

  it('should warn on unknown top-level keys', () => {
    const warnings = [];
    const logger = {
      level: 'info',
      transports: [],
      log() {},
      warn(...args) {
        warnings.push(args);
      },
      verbose() {},
      debug() {},
      info() {},
      error() {},
    };

    const config = new SVGSpriterConfig({unknownKey: true, log: logger});
    assert.ok(config);
    assert.ok(warnings.some(args => args.some(arg => String(arg).includes('unknownKey'))));
  });
});
