#!/usr/bin/env node

/**
 Svgforge is a Node.js module for creating SVG sprites

 Some code based on the command line interface originally written for svg-sprite
 by Joschi Kuphal — this is a standalone fork/package of that CLI.

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {load} from 'js-yaml';
import yargs from 'yargs';
import createSpriter from '../lib/index.js';
import {
  deepMerge,
  isObject,
  zipObject,
  isResvgAvailable,
  writeFiles,
} from '../lib/svgforge/utils/index.js';
import {createProgressBar} from '../lib/cli/progress.js';
import {printSummary} from '../lib/cli/report.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const {version} = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));

/**
 All supported sprite modes

 @type {string[]}
 */
const MODES = ['view', 'defs', 'symbol', 'stack'];

/**
 All supported stylesheet render types

 @type {string[]}
 */
const RENDER_TYPES = ['css'];

/**
 Yargs argument parser instance
 */

/* eslint-disable jsdoc/imports-as-dependencies -- yargs is in dependencies but the rule fails to detect it */
/**
@typedef {import('yargs').Argv} Yargs
*/
/* eslint-enable jsdoc/imports-as-dependencies */

/**
 CLI option definition (subset of the bundled YAML configuration)

 @typedef {object} OptionDefinition
 @property {string} [description] Option description
 @property {string} [alias] Short option alias
 @property {unknown} [default] Default value applied when the option is omitted
 @property {boolean} [required] Whether the option is mandatory
 @property {string} [map] Dot-separated config key the option maps to
 @property {object} [children] Nested option definitions keyed by their suffix
 */

/**
 A compiled output file (sprite, stylesheet or example document)

 @typedef {object} FileLike
 @property {string} path Absolute output path
 @property {Buffer|string} contents File contents
 */

/**
 Recursively nested map of file objects

 @typedef {{[key: string]: FileLike | FileMap}} FileMap
 */

/**
 Spriter configuration (subset of the SVGSpriter configuration object)

 @typedef {object} SpriterConfig
 @property {string} [dest] Main output directory
 @property {string} [log] Logging verbosity ("info", "verbose" or "debug")
 @property {object} [shape] SVG shape configuration
 @property {object} [svg] SVG output configuration
 @property {object} [mode] Sprite mode configuration
 @property {unknown} [variables] Vento template variables (or the path to their JSON file)
 */

/**
 Global spriter configuration accumulated from the CLI options

 @type {SpriterConfig}
 */
const config = {};

/**
 External JSON configuration ("--config" file) used to detect explicitly
 requested modes, render types and examples

 @type {object}
 */
let JSONConfig = {mode: {}};

/**
 Maps dot-separated config keys to their CLI option names

 @type {{[key: string]: string}}
 */
const optionsMap = {};

/**
 Resolve a path relative to the installed svgforge package root

 Default template files (e.g. "tmpl/stack/sprite.vto") ship with the
 package, so they are resolved against the package root.

 @param {string} target Path to resolve
 @returns {string} Resolved absolute path
 */
function resolveSvgForgePath(target) {
  return path.resolve(__dirname, '..', target);
}

/**
 Add a command line option and recursively register all of its children

 @param {Yargs} parser Yargs instance to extend
 @param {string} name Hyphenated option name (e.g. "defs-render-css")
 @param {OptionDefinition} option Option configuration
 @returns {Yargs} The extended yargs instance
 */
function addOption(parser, name, option) {
  let alias = name;

  // If this is an option itself
  if ('description' in option) {
    if ('alias' in option) {
      alias = option.alias;
      parser = parser.alias(alias, name);
    }

    parser = parser.describe(alias, option.description);

    if ('default' in option) {
      const templated = name.endsWith('-template');
      const defaultValue = templated ? resolveSvgForgePath(option.default) : option.default;
      parser = parser.default(alias, defaultValue, templated ? option.default : undefined);

      if (option.default === true || option.default === false) {
        parser = parser.boolean(name);
      }
    } else if (option.required) {
      parser = parser.require(alias);
    }

    if ('map' in option) {
      optionsMap[option.map] = name;
    }
  }

  const {description, alias: optAlias, default: optDefault, map, required, ...children} = option;
  for (const [key, child] of Object.entries(children)) {
    if (isObject(child)) {
      parser = addOption(parser, `${name}-${key}`, child);
    }
  }

  return parser;
}

/**
 Add a value at the given key path of a configuration object

 @param {object} store Configuration object to modify
 @param {string[]} keyPath Path segments ending at the target key
 @param {unknown} value Value to store
 @returns {void}
 */
function addConfigMap(store, keyPath, value) {
  const key = keyPath.shift();

  if (keyPath.length > 0) {
    if (!Object.hasOwn(store, key) || !isObject(store[key])) {
      store[key] = {};
    }

    addConfigMap(store[key], keyPath, value);
  } else {
    store[key] = value;
  }
}

function collectOutputPaths(result) {
  const paths = [];
  const walk = value => {
    if (value && typeof value === 'object' && typeof value.path === 'string' && value.contents) {
      paths.push(value.path);
      return;
    }

    if (value && typeof value === 'object') {
      for (const child of Object.values(value)) {
        walk(child);
      }
    }
  };

  walk(result);
  return paths;
}

/**
 Compile the spriter and write all generated files to disk

 @param {SVGSpriter} spriter Spriter instance to compile
 @param {() => void} finishProgress Finishes the progress bar
 @param {object} [options] Execution settings
 @param {boolean} [options.dryRun] Skip writing files to disk
 @returns {Promise<{written: number, outputs: string[]}>} Compile result
 */
async function compile(spriter, finishProgress, {dryRun = false} = {}) {
  try {
    const {result} = await spriter.compile();
    finishProgress();
    const outputs = collectOutputPaths(result);
    const written = dryRun ? 0 : writeFiles(result);
    return {written, outputs};
  } catch (error) {
    finishProgress();
    throw error;
  }
}

/**
 Register all CLI options from the bundled YAML configuration

 @returns {Yargs} The fully configured yargs instance
 */
function registerOptions() {
  const parser = yargs(process.argv.slice(2))
    .usage('Create one or multiple sprites of the given SVG files, optionally along with some stylesheet resources.\nUsage: $0 [options] files')
    .version(version)
    .help('help', 'Display this help information')
    .wrap(null)
    .example('$0 --view --view-example --dest=out assets/*.svg', 'Create a view sprite of the given SVG files including example document to the subdirectory "out"')
    .example('$0 --defs --defs-render-css --defs-example --dest=out assets/*.svg', 'Create a defs sprite of the given SVG files including a CSS stylesheet and example document')
    .example('$0 -S -p 10 assets/*.svg', 'Create a stack sprite and add 10px padding around all shapes')
    .showHelpOnFail(true)
    .demandCommand(1);

  try {
    const options = load(fs.readFileSync(path.resolve(__dirname, 'config.yaml'), 'utf8'));
    for (const [key, option] of Object.entries(options)) {
      addOption(parser, key, option);
    }
  } catch (error) {
    console.log(error);
  }

  return parser;
}

/**
 Apply all CLI arguments to the global configuration object

 @param {SpriterConfig} cfg Configuration object to modify
 @param {{[key: string]: string}} optMap Config keys mapped to option names
 @param {object} argv Parsed command line arguments
 @returns {void}
 */
function applyCliOptions(cfg, optMap, argv) {
  for (const [configKey, optionName] of Object.entries(optMap)) {
    if (!Object.hasOwn(argv, optionName)) {
      continue;
    }

    addConfigMap(cfg, configKey.split('.'), argv[optionName]);
  }
}

/**
 Load an external configuration file ("--config") and merge it in

 @param {SpriterConfig} cfg Configuration object to merge into
 @param {object} argv Parsed command line arguments
 @returns {Promise<void>}
 */
async function loadExternalConfig(cfg, argv) {
  if (!argv.config) {
    return;
  }

  try {
    const configFile = String(argv.config);
    delete argv.config;
    delete argv.C;

    const resolved = path.resolve(configFile);
    const ext = path.extname(resolved).toLowerCase();
    let externalConfig;

    if (['.js', '.mjs', '.cjs'].includes(ext)) {
      const mod = await import(pathToFileURL(resolved).href);
      externalConfig = mod.default ?? mod;
    } else {
      externalConfig = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    }

    // Keep an un-merged clone for the later option-removal checks
    JSONConfig = structuredClone(externalConfig);
    if (!('mode' in JSONConfig)) {
      JSONConfig.mode = {};
    }

    // Expand shorthand mode definitions
    if ('mode' in externalConfig && isObject(externalConfig.mode)) {
      for (const [mode, modeConfig] of Object.entries(externalConfig.mode)) {
        if (modeConfig !== true) {
          continue;
        }

        externalConfig.mode[mode] = {render: {css: true}};
        JSONConfig.mode[mode] = {render: {css: true}};
      }
    }

    deepMerge(cfg, externalConfig);
  } catch (error) {
    console.error('[ERROR] Skipping --config file due to errors ("%s")', error.message.trim());
  }
}

/**
 Read a shape transform configuration file to a plain object

 @param {string} file Path to the transform configuration file
 @returns {object|undefined} Parsed configuration, or nothing on error
 */
function readTransformConfig(file) {
  try {
    if (fs.existsSync(file)) {
      const contents = fs.readFileSync(file, 'utf8');
      return contents.trim() ? JSON.parse(contents) : {};
    }
  } catch {
    return undefined;
  }

  return undefined;
}

/**
 Refine the shape related configuration options

 @param {SpriterConfig} cfg Configuration object to modify
 @param {object} argv Parsed command line arguments
 @returns {void}
 */
function refineShapeConfig(cfg, argv) {
  // Refine particular config options
  cfg.shape.spacing.padding = String(cfg.shape.spacing.padding).trim();
  cfg.shape.spacing.padding = cfg.shape.spacing.padding.length > 0
    // eslint-disable-next-line unicorn/prefer-number-coercion -- Padding values may carry unit suffixes (e.g. "48px"); parseFloat is the required semantics.
    ? cfg.shape.spacing.padding.split(',').map(dimension => Number.parseFloat(dimension || 0))
    : [];

  if (cfg.svg.rootAttributes && typeof cfg.svg.rootAttributes === 'string') {
    try {
      const attributesPath = path.resolve(cfg.svg.rootAttributes);
      cfg.svg.rootAttributes = JSON.parse(fs.readFileSync(attributesPath, 'utf8'));
    } catch (error) {
      console.error('[ERROR] Skipping --svg-rootattrs file due to errors ("%s")', error.message.trim());
      cfg.svg.rootAttributes = {};
    }
  }

  // Expand transformation options
  if (typeof cfg.shape.transform !== 'string') {
    return;
  }

  const transforms = String(cfg.shape.transform).trim();
  cfg.shape.transform = [];

  if (transforms.length === 0) {
    return;
  }

  for (const raw of transforms.split(',')) {
    const transform = String(raw).trim();
    if (transform.length === 0) {
      continue;
    }

    if (Object.hasOwn(argv, `shape-transform-${transform}`)) {
      const transformConfig = readTransformConfig(argv[`shape-transform-${transform}`]);
      if (transformConfig !== undefined) {
        cfg.shape.transform.push(zipObject([transform], [transformConfig]));
      }
    } else {
      cfg.shape.transform.push(transform);
    }
  }
}

/**
 Refine the sprite mode configuration and remove inactive render types

 @param {SpriterConfig} cfg Configuration object to modify
 @param {object} argv Parsed command line arguments
 @returns {void}
 */
function refineSpriteModes(cfg, argv) {
  // Run through all sprite modes
  for (const mode of MODES) {
    if (argv[mode] !== true && !Object.hasOwn(JSONConfig.mode, mode)) {
      delete cfg.mode[mode];
      continue;
    }

    const {render} = cfg.mode[mode];

    // Remove excessive render types
    if (!render) {
      if (Array.isArray(cfg.mode[mode].dimensions) && cfg.mode[mode].dimensions.length === 0) {
        cfg.mode[mode].dimensions = true;
      }

      continue;
    }

    for (const renderType of RENDER_TYPES) {
      const arg = `${mode}-render-${renderType}`;
      if (
        Object.hasOwn(render, renderType)
        && argv[arg] !== true
        && (!Object.hasOwn(JSONConfig.mode, mode)
          || !Object.hasOwn(JSONConfig.mode[mode], 'render')
          || !Object.hasOwn(JSONConfig.mode[mode].render, renderType))
      ) {
        delete render[renderType];
      }
    }

    if (Array.isArray(cfg.mode[mode].dimensions) && cfg.mode[mode].dimensions.length === 0) {
      cfg.mode[mode].dimensions = true;
    }
  }
}

/**
 Remove excessive example options from the sprite modes

 @param {SpriterConfig} cfg Configuration object to modify
 @param {object} argv Parsed command line arguments
 @returns {void}
 */
function removeExcessiveExamples(cfg, argv) {
  for (const [mode, modeConfig] of Object.entries(cfg.mode)) {
    const example = `${mode}-example`;
    if (argv[example] !== true && (!Object.hasOwn(JSONConfig.mode, mode) || !Object.hasOwn(JSONConfig.mode[mode], 'example')) && Object.hasOwn(modeConfig, 'example')) {
      delete modeConfig.example;
    }
  }
}

function removeExcessiveManifests(cfg, argv) {
  for (const [mode, modeConfig] of Object.entries(cfg.mode)) {
    const manifest = `${mode}-manifest`;
    if (argv[manifest] !== true && (!Object.hasOwn(JSONConfig.mode, mode) || !Object.hasOwn(JSONConfig.mode[mode], 'manifest')) && Object.hasOwn(modeConfig, 'manifest')) {
      delete modeConfig.manifest;
    }
  }
}

/**
 Read and parse the Vento variables JSON file

 @param {SpriterConfig} cfg Configuration object to modify
 @returns {void}
 */
function loadVariables(cfg) {
  if (!Object.hasOwn(cfg, 'variables')) {
    return;
  }

  const variables = String(cfg.variables).trim();
  delete cfg.variables;

  if (variables.length === 0) {
    return;
  }

  const variablesFile = path.resolve(variables);
  if (fs.existsSync(variablesFile)) {
    try {
      cfg.variables = JSON.parse(fs.readFileSync(variablesFile, 'utf8'));
    } catch (error) {
      console.error('[ERROR] Skipping --variables file due to errors ("%s")', error.message.trim());
    }
  }
}

/**
 Resolve the output directories that must not be re-ingested as source files

 Generated artifacts (sprites, stylesheets, examples) live inside the configured
 destination tree. When an input glob covers that tree (e.g. a recursive
 SVG glob), a sprite written by a previous run would otherwise be fed back
 in as a shape with an id derived from its output path (e.g.
 "assets--OUT--stack--svg--sprite").

 @param {SpriterConfig} cfg Spriter configuration
 @returns {string[]} Absolute output root directories to exclude from the input
 */
function getExcludedInputRoots(cfg) {
  const destRoot = path.resolve(cfg.dest || '.');
  const roots = new Set([destRoot]);

  // When the destination defaults to the current directory every glob would
  // land inside it, so restrict the exclusion to the mode specific output
  // directories instead.
  if (destRoot === process.cwd()) {
    roots.clear();

    for (const mode of MODES) {
      const modeDest = cfg.mode?.[mode]?.dest;

      if (modeDest) {
        roots.add(path.resolve(destRoot, modeDest));
      }
    }
  }

  return [...roots];
}

/**
 Run the command line interface

 @returns {Promise<void>} Promise resolving after all sprites were written
 */
async function main() {
  const parser = registerOptions();
  const argv = parser.parse();

  // Map all arguments to a global configuration object
  applyCliOptions(config, optionsMap, argv);

  // Load external config file
  await loadExternalConfig(config, argv);

  // Refine particular config options
  refineShapeConfig(config, argv);
  refineSpriteModes(config, argv);
  removeExcessiveExamples(config, argv);
  removeExcessiveManifests(config, argv);
  loadVariables(config);

  const collectInputFiles = () => {
    const matchedFiles = argv._.flatMap(pattern => {
      const marker = pattern.lastIndexOf('./');
      const baseDepth = marker === -1 ? 0 : pattern.slice(0, marker).split('/').filter(Boolean).length;
      return fs.globSync(pattern)
        .toSorted((a, b) => b.localeCompare(a))
        .map(file => ({baseDepth, file}));
    });
    const excludedInputRoots = getExcludedInputRoots(config);
    const ignorePatterns = typeof config.ignore === 'string'
      ? config.ignore.split(',').map(p => p.trim()).filter(Boolean)
      : (Array.isArray(config.ignore) ? config.ignore : []);
    const filterPatterns = typeof config.filter === 'string'
      ? config.filter.split(',').map(p => p.trim()).filter(Boolean)
      : (Array.isArray(config.filter) ? config.filter : []);
    const matchesPattern = (file, pattern) =>
      (typeof path.matchesGlob === 'function' ? path.matchesGlob(file, pattern) : file.includes(pattern));
    const isIgnored = file => ignorePatterns.some(pattern => matchesPattern(file, pattern));
    const isFilteredOut = file => filterPatterns.length > 0 && filterPatterns.every(pattern => !matchesPattern(file, pattern) && !matchesPattern(path.basename(file), pattern));
    const isExcludedFile = file => {
      const resolved = path.resolve(file);
      return excludedInputRoots.some(root => resolved === root || resolved.startsWith(root + path.sep)) || isIgnored(file) || isFilteredOut(file);
    };

    const inputFiles = matchedFiles.filter(({file}) => !isExcludedFile(file));
    return {matchedFiles, inputFiles, isExcludedFile};
  };

  const runBuild = async () => {
    const buildStartedAt = Date.now();
    const spriter = createSpriter(config);
    const progressBar = createProgressBar(spriter, config.quiet || Boolean(config.json));

    spriter.on('shape-skipped', ({file, error}) => {
      process.stderr.write(`Skipping "${file}" (${error.message})\n`);
    });

    const {matchedFiles, inputFiles, isExcludedFile} = collectInputFiles();
    progressBar.refreshTotal(inputFiles.length);

    for (const {baseDepth, file: filePattern} of matchedFiles) {
      const file = path.resolve(filePattern);
      if (isExcludedFile(file)) {
        continue;
      }

      const isRelative = !path.isAbsolute(filePattern) && !filePattern.startsWith('../');
      let basename;
      let linkTarget;

      try {
        linkTarget = fs.readlinkSync(file);
      } catch {
        linkTarget = undefined;
      }

      if (linkTarget !== undefined) {
        basename = path.basename(linkTarget);
      } else if (baseDepth > 0) {
        basename = filePattern.split('/').filter(Boolean).slice(baseDepth).join('/');
      } else {
        basename = isRelative ? filePattern : path.basename(file);
      }

      spriter.add(file, basename, fs.readFileSync(file));
    }

    const {written, outputs} = await compile(spriter, progressBar.finish, {dryRun: Boolean(config.dryRun)});
    const summary = {
      processed: inputFiles.length,
      skipped: matchedFiles.length - inputFiles.length,
      modes: config.mode,
      files: written,
      outputs,
      dest: config.dest ?? '.',
      elapsedMs: Date.now() - buildStartedAt,
      concurrency: spriter.limit,
      resvg: await isResvgAvailable(),
      dimensionSkipped: spriter.dimensionSkipped,
      errorSkipped: spriter.errorSkipped,
      cliVersion: version,
      dryRun: Boolean(config.dryRun),
    };

    if (config.json) {
      process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    } else {
      printSummary(summary);
    }

    return {inputFiles};
  };

  try {
    const {inputFiles} = await runBuild();

    if (config.watch) {
      const watchDirs = [...new Set(inputFiles.map(({file}) => path.dirname(path.resolve(file))))];
      let timer;
      const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          try {
            await runBuild();
          } catch (error) {
            console.error(error);
          }
        }, 150);
      };

      for (const dir of watchDirs) {
        // eslint-disable-next-line n/prefer-promises/fs -- Callback watch keeps the simple debounce loop lightweight.
        fs.watch(dir, {persistent: true}, schedule);
      }

      process.stderr.write('Watching for changes...\n');
    }
  } catch (error) {
    console.error(error);
  }
}

await main();
