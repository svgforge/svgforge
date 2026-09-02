
import path from 'node:path';
import {globSync} from 'node:fs';
import {paths} from './constants.js';

const cwdWeather = path.join(paths.fixtures, 'svg/single');
const cwdWithoutDims = path.join(paths.fixtures, 'svg/special/without-dims');
const weather = globSync('**/weather*.svg', {cwd: cwdWeather}).toSorted((a, b) => b.localeCompare(a));
const withoutDims = globSync('**/*.svg', {cwd: cwdWithoutDims}).toSorted((a, b) => b.localeCompare(a));

export const constants = {
  DEFAULT: {
    name: 'weather',
    namespace: '',
    files: weather,
    cwd: cwdWeather,
  },
  WITHOUT_DIMS: {
    name: 'without-dims',
    namespace: '-without-dims',
    files: withoutDims,
    cwd: cwdWithoutDims,
  },

};

const TEST_CONFIGS = [constants.DEFAULT, constants.WITHOUT_DIMS];

export default TEST_CONFIGS;
