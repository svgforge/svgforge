import merge from 'lodash.merge';
import pretty from 'prettysize';
import {getDependency} from '../deps.js';
import ModeCss from './mode/css.js';
import ModeView from './mode/view.js';
import ModeDefs from './mode/defs.js';
import ModeSymbol from './mode/symbol.js';
import ModeStack from './mode/stack.js';

const layoutModes = {
  css: ModeCss,
  view: ModeView,
  defs: ModeDefs,
  symbol: ModeSymbol,
  stack: ModeStack,
};

const defaultConfig = {
  css: {
    dest: 'css',
    layout: 'packed',
    common: null,
    mixin: null,
    prefix: '.svg-%s',
    dimensions: '-dims',
    sprite: 'svg/sprite.css.svg',
    bust: true,
  },
  view: {
    dest: 'view',
    layout: 'packed',
    common: null,
    mixin: null,
    prefix: '.svg-%s',
    dimensions: '-dims',
    sprite: 'svg/sprite.view.svg',
    bust: true,
  },
  defs: {
    dest: 'defs',
    prefix: '.svg-%s',
    dimensions: '-dims',
    sprite: 'svg/sprite.defs.svg',
    inline: false,
    example: false,
    bust: false,
  },
  symbol: {
    dest: 'symbol',
    prefix: '.svg-%s',
    dimensions: '-dims',
    sprite: 'svg/sprite.symbol.svg',
    inline: false,
    example: false,
    bust: false,
  },
  stack: {
    dest: 'stack',
    prefix: '.svg-%s',
    dimensions: '-dims',
    sprite: 'svg/sprite.stack.svg',
    example: false,
    bust: false,
  },
};

const defaultMustacheVariables = {
  date: new Date().toGMTString(),
  invert() {
    return (num, render) => -Number.parseFloat(render(num));
  },
  classname() {
    return (str, render) => {
      const classname = render(str).replaceAll(/\s+/g, ' ').split(' ').pop();
      return classname.startsWith('.') ? classname.substr(1) : classname;
    };
  },
  escape() {
    return (str, render) => render(str).replaceAll('\\', '\\\\');
  },
  encodeHashSign() {
    return (str, render) => render(str).replaceAll('#', '%23');
  },
};

export default class SVGSpriteLayouter {
  /**
   * SVGSprite layouter
   *
   * @param {SVGSpriter} spriter SVG spriter
   * @param {object} config Layout configuration
   */
  constructor(spriter, config) {
    this._spriter = spriter;
    this.config = config;
    this.mode = null;
    this.files = {};
    this.data = {};
    this._commonData = {
      shapes: [],
      ...defaultMustacheVariables,
      ...this._spriter.config.variables,
    };

    // Register the common shapes data
    const lastShapeIndex = this._spriter._shapes.length - 1;

    for (const [index, shape] of this._spriter._shapes.entries()) {
      const {width, height} = shape.getDimensions();
      const {top, right, bottom, left} = shape.config.spacing.padding;

      this._commonData.shapes.push({
        name: shape.id,
        base: shape.base,
        master: shape.master?.id ?? null,
        width: {
          inner: width - right - left,
          outer: width,
        },
        height: {
          inner: height - top - bottom,
          outer: height,
        },
        first: index === 0,
        last: index === lastShapeIndex,
        fileSize: this.config.example ? pretty(shape.source.contents.length) : null,
      });
    }

    this._spriter.debug('Created layouter instance');
  }

  /**
   * Layout as a sprite
   *
   * @param {object} files Files
   * @param {string} key Result key
   * @param {string} mode Mode
   * @param {Function} cb Callback
   */
  layout(files, key, mode, cb) {
    this._spriter.info('Laying out «%s» sprite («%s» mode)', key, mode);
    const config = merge(merge(merge({}, defaultConfig[mode]), {svg: this._spriter.config.svg}), this.config[key] || {});
    const data = merge(merge(merge({}, this._commonData), this._spriter.config.variables), config.variables);
    const SVGSpriteLayout = getDependency('layouter:layoutModes', layoutModes)[mode];
    const sprite = new SVGSpriteLayout(this._spriter, config, data, key);
    files[key] = {};
    sprite.layout(files[key], cb);
  }
}
