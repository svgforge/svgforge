import {EventEmitter} from 'node:events';
import File from 'vinyl';
import SVGSpriterQueue from '../../lib/svg-sprite/queue.js';
import {setDependency} from '../../lib/deps.js';
import {
  before,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '../test/helpers/jest-compat.js';

const mockShape = jest.fn();
setDependency('queue:Shape', mockShape);

describe('probe queue', () => {
  let spriter;
  let queue;
  beforeEach(() => {
    spriter = { debug: jest.fn(), _limit: 10, error: jest.fn(), _transformShape: jest.fn((sh,cb)=>cb(null)) };
    queue = new SVGSpriterQueue(spriter);
  });

  it('error active=2', async () => {
    const TEST_FILE = new File({path: '/base/file', base: '/base/'});
    queue._files = [1];
    queue.active = 2;
    jest.spyOn(queue._files, 'shift').mockReturnValueOnce(TEST_FILE);
    jest.spyOn(queue, 'emit');
    mockShape.mockImplementation(() => { throw new Error('error'); });
    try {
      queue.process();
      await new Promise(setImmediate);
      console.log('PASS run');
      console.log('active:', queue.active);
      console.log('spriter.error called:', spriter.error.mock.calls);
      console.log('emit called:', queue.emit.mock.calls);
    } catch (e) {
      console.log('THREW:', e.message);
    }
  });
});
