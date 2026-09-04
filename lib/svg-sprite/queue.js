import {EventEmitter} from 'node:events';
import path from 'node:path';
import {getDependency} from '../deps.js';
import {runWaterfall} from './utils/index.js';
import Shape from './shape.js';

/**
 Processing queue for shape files, feeding a spriter instance

 @param {SVGSpriter} spriter SVGSpriter instance
 */
// This queue exposes the EventEmitter API (`on`/`emit`) consumed by the spriter and the test helpers; EventTarget is not a drop-in.
// eslint-disable-next-line unicorn/prefer-event-target -- EventEmitter is a deliberate public API contract here.
export default class SVGSpriterQueue extends EventEmitter {
  constructor(spriter) {
    super();

    this._spriter = spriter;
    this._files = [];
    this.active = 0;

    this.on('add', this.process.bind(this));
    this.on('remove', this.process.bind(this));

    this._spriter.debug('Created processing queue instance');
  }

  /**
   Add a shape to the processing queue

   @param {File} file Shape file
   */
  add(file) {
    this._spriter.debug('Added "%s" to processing queue', file.path.slice(file.base.length + path.sep.length));
    this._files.push(file);
    this.emit('add');
  }

  /**
   Try to process an item in the queue
   */
  process() {
    if (!(this._files.length > 0 && this.active < this._spriter._limit)) {
      return;
    }

    ++this.active;
    const file = this._files.shift();
    let shape;
    let spriter;

    // Instantiate the shape
    try {
      shape = new (getDependency('queue:Shape', Shape))(file, this._spriter);
      spriter = this._spriter;

      // In case of errors: Skip the file
    } catch (error) {
      this._spriter.error('Skipping "%s" (%s)', file.path.slice(file.base.length + path.sep.length), error.message);
      this.emit(--this.active ? 'remove' : 'empty');
      return;
    }

    // Subsequently run through all optimization and compilation tasks
    runWaterfall([
      // Transform the shape
      _cb => {
        spriter._transformShape(shape, _cb);
      },

      // Complement the shape
      _cb => {
        shape.complement(_cb);
      },
    ], this.remove.bind(this));
  }

  /**
   Remove a shape from the queue

   @param {Error} error Processing error, if any
   @param {SVGShape} shape Processed shape
   */
  remove(error, shape) {
    this._spriter._shapes.push(shape);
    this.emit(--this.active ? 'remove' : 'empty');
  }
}
