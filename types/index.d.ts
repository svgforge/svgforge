/* eslint-disable unicorn/prefer-event-target -- SVGSpriter extends EventEmitter in the JS implementation. */
import {EventEmitter} from 'node:events';

export type SpriteFile = {
  base: string;
  path: string;
  contents: Uint8Array;
  readonly relative: string;
};

export type CompileResult = {
  result: Record<string, Record<string, SpriteFile>>;
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

export type SVGSpriterConfig = {
  dest?: string;
  log?: string | LoggerLike | undefined | false;
  shape?: Record<string, unknown>;
  svg?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  mode?: Record<string, unknown>;
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
  compile(config?: Record<string, unknown>): Promise<CompileResult>;
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
export default createSpriter;
