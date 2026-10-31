
import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';
import SVGSpriterConfig from '../../../lib/svgforge/config.js';

describe('testing filter', () => {
  let config;
  const modes = ['stack', 'defs', 'view', 'symbol'];

  beforeEach(() => {
    config = new SVGSpriterConfig({});
  });

  it('should return empty object if empty object passed', () => {
    assert.deepStrictEqual(config.filter({}), {});
  });

  for (const mode of modes) {
    it(`should filter plainObjects and set ${mode} mode if mode is not specified`, () => {
      assert.deepStrictEqual(config.filter({
        [mode]: {},
      }), {[mode]: {mode}});
      assert.deepStrictEqual(config.filter({
        [mode]: true,
      }), {[mode]: {mode}});
    });
  }

  for (const mode of modes) {
    it(`should filter plainObjects and set mode ${mode} if mode is specified`, () => {
      assert.deepStrictEqual(config.filter({
        view: {
          mode,
        },
      }), {view: {mode}});
    });
  }

  it('should ignore plainObjects with bad config', () => {
    assert.deepStrictEqual(config.filter({
      view: {
        mode: 'nonsense',
      },
    }), {});
    assert.deepStrictEqual(config.filter({
      nonsense: {},
    }), {});
  });

  for (const mode of modes) {
    it(`should ignore if passed value is not object and not true for ${mode}`, () => {
      assert.deepStrictEqual(config.filter({
        [mode]: 'nonsense',
      }), {});
      assert.deepStrictEqual(config.filter({
        [mode]: false,
      }), {});
      assert.deepStrictEqual(config.filter({
        [mode]: Symbol('test'),
      }), {});
    });
  }
});
