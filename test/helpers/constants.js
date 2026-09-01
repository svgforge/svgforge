import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const paths = {
  tmp: path.resolve(path.join(__dirname, '../../tmp')),
  fixtures: path.resolve(path.join(__dirname, '../fixture')),
  expectations: path.resolve(path.join(__dirname, '../expected')),
};

export const browser = {
  width: 1280,
  height: 1024,
};
