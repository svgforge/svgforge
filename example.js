import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {globSync} from 'glob';
import SVGSpriter from './lib/svg-sprite.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cwd = path.join(__dirname, 'test/fixture/svg/single');
const dest = path.join(__dirname, 'tmp');
const files = globSync('**/weather*.svg', {cwd});

const svgoConfig = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeUnknownsAndDefaults: {
            keepRoleAttr: true,
          },
          removeViewBox: false,
        },
      },
    },
    'cleanupListOfValues',
    'convertStyleToAttrs',
    'sortAttrs',
    {
      name: 'removeAttrs',
      params: {
        attrs: [
          'clip-rule',
          'data-name',
        ],
      },
    },
  ],
};

const spriter = new SVGSpriter({
  dest,
  log: 'debug',
  svg: {
    doctypeDeclaration: false,
    xmlDeclaration: false,
  },
  shape: {
    transform: [{
      svgo: svgoConfig,
    }],
  },
});

/**
 Add a bunch of SVG files

 @param {SVGSpriter} targetSpriter Spriter instance
 @param {string[]} targetFiles SVG files
 @returns {SVGSpriter} Spriter instance
 */
function addFixtureFiles(targetSpriter, targetFiles) {
  for (const file of targetFiles) {
    const filePath = path.join(cwd, file);
    targetSpriter.add(path.resolve(filePath), file, fs.readFileSync(filePath, 'utf8'));
  }

  return targetSpriter;
}

addFixtureFiles(spriter, files).compile({
  css: {
    sprite: 'svg/sprite.vertical.svg',
    layout: 'vertical',
    dimensions: true,
    render: {
      css: true,
      scss: true,
    },
  },
}, (error, result) => {
  for (const type of Object.values(result.css)) {
    fs.mkdirSync(path.dirname(type.path), {recursive: true});
    fs.writeFileSync(type.path, type.contents);
  }
});
