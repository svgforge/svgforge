/* eslint-disable unicorn/prefer-event-target -- SVGSpriter extends EventEmitter in the JS implementation. */
import {EventEmitter} from 'node:events';

export type SpriteFile = {
  base: string;
  path: string;
  contents: Uint8Array;
  readonly relative: string;
};

export type CompileModeResult = Record<string, SpriteFile>;
export type CompileResult = {
  result: Record<string, CompileModeResult>;
  data: Record<string, unknown>;
};

export type ProgressEvent = {
  processed: number;
  total: number;
};

export type ShapeSkippedEvent = {
  file: string;
  error: Error;
};

export type LoggerLike = {
  info(...args: unknown[]): void;
  verbose(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

export type RenderConfig = boolean | {
  template?: string;
  dest?: string;
  [key: string]: unknown;
};

export type ExampleConfig = boolean | {
  template?: string;
  dest?: string;
  [key: string]: unknown;
};

export type ManifestConfig = boolean | {
  dest?: string;
  [key: string]: unknown;
};

export type CommonModeConfig = {
  mode?: 'view' | 'defs' | 'symbol' | 'stack';
  dest?: string;
  prefix?: string;
  dimensions?: string | boolean;
  sprite?: string;
  bust?: boolean;
  render?: Record<string, RenderConfig>;
  example?: ExampleConfig;
  manifest?: ManifestConfig;
  [key: string]: unknown;
};

export type ViewModeConfig = CommonModeConfig & {
  layout?: 'horizontal' | 'vertical' | 'diagonal' | 'packed';
};

export type DefsModeConfig = CommonModeConfig & {
  inline?: boolean;
};

export type SymbolModeConfig = CommonModeConfig & {
  inline?: boolean;
};

export type StackModeConfig = CommonModeConfig & {
  rootviewbox?: boolean | string;
};

export type ModeConfig = CommonModeConfig | ViewModeConfig | DefsModeConfig | SymbolModeConfig | StackModeConfig;

export type ModeMap = {
  view?: boolean | ViewModeConfig;
  defs?: boolean | DefsModeConfig;
  symbol?: boolean | SymbolModeConfig;
  stack?: boolean | StackModeConfig;
  [key: string]: boolean | ModeConfig | undefined;
};

export type ShapeDimensionConfig = {
  maxWidth?: number;
  maxHeight?: number;
  precision?: number;
  attributes?: boolean;
  [key: string]: unknown;
};

export type ShapeSpacingConfig = {
  padding?: number | number[];
  box?: 'content' | 'padding' | 'icon';
  [key: string]: unknown;
};

export type ShapeIdConfig = {
  separator?: string;
  generator?: string | ((name: string, file: Record<string, unknown>) => string);
  pseudo?: string;
  whitespace?: string;
  [key: string]: unknown;
};

export type ShapeAccessibilityConfig = {
  autoTitle?: boolean;
  [key: string]: unknown;
};

export type ShapeConfig = {
  id?: ShapeIdConfig;
  dimension?: ShapeDimensionConfig;
  spacing?: ShapeSpacingConfig;
  accessibility?: ShapeAccessibilityConfig;
  dedupe?: boolean;
  transform?: Array<string | Record<string, unknown> | ((shape: unknown, sprite: unknown, callback?: (error: Error | undefined) => void) => void | Promise<void>)>;
  meta?: string | Record<string, {title?: string; description?: string}>;
  sort?: (shape1: {id: string}, shape2: {id: string}) => number;
  dest?: string;
  [key: string]: unknown;
};

export type SvgConfig = {
  xmlDeclaration?: boolean;
  doctypeDeclaration?: boolean;
  namespaceIDs?: boolean;
  namespaceIDPrefix?: string;
  namespaceClassnames?: boolean;
  dimensionAttributes?: boolean;
  rootAttributes?: Record<string, string | number | boolean>;
  transform?: ((svg: string) => string) | Array<(svg: string) => string>;
  [key: string]: unknown;
};

export type SVGSpriterConfig = {
  dest?: string;
  log?: string | LoggerLike | undefined | false;
  shape?: ShapeConfig;
  svg?: SvgConfig;
  variables?: Record<string, unknown>;
  mode?: ModeMap;
  json?: boolean;
  dryRun?: boolean;
  watch?: boolean;
  quiet?: boolean;
  ignore?: string | string[];
  filter?: string | string[];
  [key: string]: unknown;
};

export type FileLike = {
  base: string;
  path: string;
  contents: Uint8Array;
  [key: string]: unknown;
};

export declare class SVGSpriter extends EventEmitter {
  config: Record<string, any>;
  readonly limit: number;
  readonly dimensionSkipped: number;
  readonly errorSkipped: number;
  constructor(config?: SVGSpriterConfig);
  add(file?: FileLike | string, name?: string, svg?: Uint8Array | string): this;
  compile(config?: ModeMap): Promise<CompileResult>;
  getShapes(dest?: string): Promise<SpriteFile[]>;
  info(...args: unknown[]): void;
  verbose(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  on(event: 'progress', listener: (payload: ProgressEvent) => void): this;
  on(event: 'shape-skipped', listener: (payload: ShapeSkippedEvent) => void): this;
  on(event: 'compiled', listener: () => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
}

export declare class ArgumentError extends Error {
  name: 'ArgumentError';
}

export declare class DimensionsCalculationError extends Error {
  name: 'DimensionsCalculationError';
}

export declare class NotPermittedError extends Error {
  name: 'NotPermittedError';
}

export declare class XmlFixingError extends Error {
  name: 'XmlFixingError';
}

export declare function createSpriter(config?: SVGSpriterConfig): SVGSpriter;
export declare function writeFiles(files: Record<string, unknown>): number;
// eslint-disable-next-line unicorn/consistent-boolean-name -- Async availability check, not a boolean property.
export declare function isResvgAvailable(): Promise<boolean>;
export default createSpriter;
