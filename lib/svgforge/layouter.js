import {getDependency} from '../deps.js';
import prettySize from './utils/pretty-size.js';
import {deepMerge} from './utils/index.js';
import ModeView from './mode/view/index.js';
import ModeDefs from './mode/defs.js';
import ModeSymbol from './mode/symbol.js';
import ModeStack from './mode/stack.js';

const layoutModes = {
  view: ModeView,
  defs: ModeDefs,
  symbol: ModeSymbol,
  stack: ModeStack,
};

const defaultConfig = {
  view: {
    dest: 'view',
    prefix: '.svg-%s',
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

const defaultTemplateVariables = {
  date: new Date().toGMTString(),
  invert(number_) {
    // The value may carry a unit suffix (e.g. '10px'), so keep `parseFloat`.
    // eslint-disable-next-line unicorn/prefer-number-coercion
    return -Number.parseFloat(number_);
  },
  classname(string_) {
    const classname = String(string_).replaceAll(/\s+/gu, ' ').split(' ').pop();
    return classname.startsWith('.') ? classname.slice(1) : classname;
  },
  escape(string_) {
    return String(string_).replaceAll('\\', '\\\\');
  },
  encodeHashSign(string_) {
    return String(string_).replaceAll('#', '%23');
  },
};

export default class SVGSpriteLayouter {
  /**
   Create the sprite layouter

   @param {SVGSpriter} spriter SVG spriter
   @param {object} config Layout configuration
   */
  constructor(spriter, config) {
    this._spriter = spriter;
    this.config = config;
    this.mode = null;
    this.files = {};
    this.data = {};
    this._commonData = {
      shapes: [],
      ...defaultTemplateVariables,
      ...this._spriter.config.variables,
    };

    // Any configured mode may render an HTML example file that displays the
    // shape size, so look for the option across all mode configurations.
    const shapeExample = Object.values(config).some(modeConfig => modeConfig.example);

    // Register the common shapes data
    const lastShapeIndex = this._spriter._shapes.length - 1;

    for (const [index, shape] of this._spriter._shapes.entries()) {
      const {width, height} = shape.getDimensions();
      const {top, right, bottom, left} = shape.config.spacing.padding;

      this._commonData.shapes.push({
        name: shape.id,
        base: shape.base,
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
        fileSize: shapeExample ? prettySize(shape.source.contents.length) : null,
      });
    }

    this._spriter.debug('Created layouter instance');
  }

  /**
   Layout as a sprite

   @param {object} files Files to populate
   @param {string} key Result key
   @param {string} mode Layout mode identifier
   @param {(error: Error|null) => void} cb Node-style completion callback
   */
  layout(files, key, mode, cb) {
    this._spriter.info('Laying out «%s» sprite («%s» mode)', key, mode);
    const config = deepMerge({...defaultConfig[mode], svg: this._spriter.config.svg}, this.config[key] || {});
    const data = deepMerge({...this._commonData}, config.variables);
    const SVGSpriteLayout = getDependency('layouter:layoutModes', layoutModes)[mode];
    const sprite = new SVGSpriteLayout(this._spriter, config, data, key);
    files[key] = {};
    sprite.layout(files[key], cb);
  }
}
