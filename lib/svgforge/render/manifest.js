import path from 'node:path';
import {Buffer} from 'node:buffer';
import SpriteFile from '../file.js';

/**
 Build a JSON manifest resource for a sprite mode

 @param {object} files Sprite files being populated
 @param {object} mode Mode instance
 @returns {object} Sprite files
 */
export default function buildManifest(files, mode) {
  if (!mode.config.manifest) {
    return files;
  }

  const spritePath = mode.config.sprite ? path.basename(mode.config.sprite) : null;
  const shapes = (mode.data.shapes || []).map(shape => ({
    name: shape.name,
    base: shape.base,
    width: typeof shape.width === 'object' && shape.width ? shape.width.outer : shape.width,
    height: typeof shape.height === 'object' && shape.height ? shape.height.outer : shape.height,
  }));

  const manifest = {
    mode: mode.mode,
    key: mode.key,
    sprite: spritePath,
    shapes,
  };

  files.manifest = new SpriteFile({
    base: mode.config.dest,
    path: mode.config.manifest.dest,
    contents: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
  });

  mode._spriter.verbose('Created «%s» manifest file («%s» mode)', mode.key, mode.mode);
  return files;
}
