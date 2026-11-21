export declare function isFunction(value: unknown): value is (...args: any[]) => any;
export declare function isObject(value: unknown): value is Record<string, unknown>;
export declare function isPlainObject(value: unknown): value is Record<string, unknown>;
export declare function isString(value: unknown): value is string;
export declare function trimStart(inputString: string, charsToTrim?: string): string;
export declare function zipObject<T = unknown>(array1: PropertyKey[], array2: T[]): Record<string, T>;
export declare function deepMerge<T extends Record<string, any>>(destination: T, ...sources: Array<Record<string, any> | undefined>): T;
export declare function escapeHtml(value: unknown): string;
export declare function runWaterfall(
  tasks: Array<((cb: (error: Error | undefined) => void) => unknown) | (() => unknown | Promise<unknown>)>,
  done?: (error: Error | undefined) => void,
): Promise<void>;
export declare function runParallelLimit<T = unknown>(
  tasks: Array<((cb: (error: Error | undefined, ...results: any[]) => void) => unknown) | (() => T | Promise<T>)>,
  limit: number,
  done?: (error: Error | undefined, results?: T[]) => void,
): Promise<T[] | undefined>;
// eslint-disable-next-line unicorn/consistent-boolean-name -- Async availability check, not a boolean property.
export declare function isResvgAvailable(): Promise<boolean>;
