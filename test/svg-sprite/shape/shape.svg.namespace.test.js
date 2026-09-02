
import {Buffer} from 'node:buffer';
import xpath from 'xpath';
import File from 'vinyl';
import SVGShape from '../../../lib/svg-sprite/shape.js';
import NotPermittedError from '../../../lib/svg-sprite/errors/not-permitted-error.js';
import {setDependency} from '../../../lib/deps.js';
import {
  describe,
  expect,
  it,
  createMock,
  spyOn,
} from '../../helpers/jest-compat.js';

const mockMinifyBlock = createMock().mockReturnValue({css: ''});
setDependency('csso', {minifyBlock: mockMinifyBlock});

const TEST_SPRITER = {
  config: {
    shape: {
      meta: {},
      align: {},
    },
    svg: {
      doctypeDeclaration: '',
    },
  },
  verbose: createMock(),
};
const TEST_FILE = new File({
  contents: Buffer.from('<svg></svg>'),
  path: '/test_base/test_path',
  base: '/test_base/',
  cwd: '/',
});

describe('testing setNamespace()', () => {
  /**
   Creates a configured SVGShape for namespace testing.
   @param {boolean} addNamespaceIds shape.spriter.config.svg.namespaceIDs
   @param {boolean} isNamespaced shape._namespaced
   @param {boolean} addNamespaceClassnames shape.spriter.config.svg.namespaceClassnames
   @returns {object} SVGShape
   */
  const createShape = (addNamespaceIds, isNamespaced, addNamespaceClassnames) => {
    const shape = new SVGShape(TEST_FILE, TEST_SPRITER);

    shape.spriter.config.svg.namespaceIDs = addNamespaceIds;
    shape.spriter.config.svg.namespaceClassnames = addNamespaceClassnames;
    shape._namespaced = isNamespaced;
    shape.svg.ready = '<svg/>';
    return shape;
  };

  it('should raise error if shape is not ready', () => {
    expect.hasAssertions();

    const shape = createShape(true, false, true);
    shape.svg.ready = false;

    expect(() => {
      shape.setNamespace({});
    }).toThrow(new NotPermittedError('Shape namespace cannot be set before complementing'));
  });

  describe('if namespaceIds', () => {
    it('should call multiple xpath.select and set attributes', () => {
      expect.hasAssertions();

      const shape = createShape(true, false, false);
      spyOn(shape, '_replaceIdAndClassnameReferences').mockImplementation().mockReturnValue('');
      const TEST_NAMESPACE = 'test-namespace';
      const TEST_ATTR_VALUE = 'id';

      const FIRST_ELEMENTS = [{
        getAttribute: createMock().mockReturnValueOnce(TEST_ATTR_VALUE),
        setAttribute: createMock(),
      }];
      const SECOND_ELEMENTS = [{
        nodeValue: 'data:',
      }, {
        nodeValue: `#${TEST_ATTR_VALUE}`,
        ownerElement: {
          setAttribute: createMock(),
        },
      }];
      const THIRD_ELEMENTS = [{
        nodeValue: 'data:',
      }, {
        nodeValue: `#${TEST_ATTR_VALUE}`,
        ownerElement: {
          setAttribute: createMock(),
        },
      }];
      const FOURTH_ELEMENTS = [{
        localName: 'TEST local name',
        ownerElement: {
          setAttribute: createMock(),
        },
      }];

      const SIXTH_ELEMENTS = [{
        ownerElement: {setAttribute: createMock()},
      }];
      const mockSelect = createMock()
        .mockReturnValueOnce(FIRST_ELEMENTS)
        .mockReturnValueOnce(SECOND_ELEMENTS)
        .mockReturnValueOnce(THIRD_ELEMENTS)
        .mockReturnValueOnce(FOURTH_ELEMENTS)
        .mockReturnValue(SIXTH_ELEMENTS);

      spyOn(xpath, 'useNamespaces').mockReturnValueOnce(mockSelect);

      shape.setNamespace(TEST_NAMESPACE);

      expect(mockSelect).toHaveBeenCalledTimes(14);
      expect(mockSelect.mock.calls[0][0]).toBe('//*[@id]');
      expect(mockSelect.mock.calls[1][0]).toBe('//@xlink:href');
      expect(mockSelect.mock.calls[2][0]).toBe('//@href');

      const attributes = ['style', 'fill', 'stroke', 'filter', 'clip-path', 'mask', 'marker-start', 'marker-end', 'marker-mid'];

      for (const [i, ref] of attributes.entries()) {
        expect(mockSelect.mock.calls[3 + i][0]).toBe(`//@${ref}`);
      }

      expect(mockSelect.mock.calls[12][0]).toBe('//svg:style');
      expect(mockSelect.mock.calls[13][0]).toBe('//svg:style');

      expect(FIRST_ELEMENTS[0].setAttribute).toHaveBeenCalledWith('id', `${TEST_NAMESPACE}${TEST_ATTR_VALUE}`);
      expect(SECOND_ELEMENTS[1].ownerElement.setAttribute).toHaveBeenCalledWith('xlink:href', `#${TEST_NAMESPACE}${TEST_ATTR_VALUE}`);
      expect(THIRD_ELEMENTS[1].ownerElement.setAttribute).toHaveBeenCalledWith('href', `#${TEST_NAMESPACE}${TEST_ATTR_VALUE}`);
      expect(FOURTH_ELEMENTS[0].ownerElement.setAttribute).toHaveBeenCalledWith(FOURTH_ELEMENTS[0].localName, '');
      expect(shape._namespaced).toBe(true);

      expect(mockMinifyBlock).toHaveBeenCalledWith('', {restructure: false});
    });

    it('should set aria-labelledby', () => {
      expect.hasAssertions();

      const shape = createShape(true, false, false);
      spyOn(shape, '_replaceIdAndClassnameReferences').mockImplementation();
      const TEST_ATTR_VALUE = 'id';
      const TEST_NAMESPACE = 'test-namespace';

      const FIRST_ELEMENTS = [{
        getAttribute: createMock().mockReturnValueOnce(TEST_ATTR_VALUE),
        setAttribute: createMock(),
      }];

      spyOn(shape.dom.documentElement, 'hasAttribute').mockImplementation().mockReturnValueOnce(true);
      spyOn(shape.dom.documentElement, 'getAttribute').mockImplementation().mockReturnValueOnce(`${TEST_ATTR_VALUE} test`);
      spyOn(shape.dom.documentElement, 'setAttribute').mockImplementation();
      spyOn(xpath, 'useNamespaces').mockReturnValueOnce(createMock().mockReturnValueOnce(FIRST_ELEMENTS).mockReturnValue([]));

      shape.setNamespace(TEST_NAMESPACE);

      expect(shape.dom.documentElement.setAttribute).toHaveBeenCalledWith('aria-labelledby', `${TEST_NAMESPACE}${TEST_ATTR_VALUE} test`);
    });
  });

  describe('with namespaceClassnames', () => {
    it('should call xpath.select with //*[@class]', () => {
      expect.hasAssertions();

      const shape = createShape(false, false, true);
      spyOn(shape, '_replaceIdAndClassnameReferences').mockImplementation();
      const TEST_ELEMENTS = [{
        getAttribute: createMock().mockReturnValueOnce('1 2 3 4 5  6 '),
        setAttribute: createMock(),
      }];
      const TEST_NAMESPACE = 'ns';

      const mockSelect = createMock().mockReturnValueOnce(TEST_ELEMENTS).mockReturnValueOnce([]);

      spyOn(xpath, 'useNamespaces').mockReturnValueOnce(mockSelect);

      shape.setNamespace(TEST_NAMESPACE);

      expect(mockSelect).toHaveBeenCalledWith('//*[@class]', shape.dom);
      expect(TEST_ELEMENTS[0].setAttribute).toHaveBeenCalledWith('class', `${TEST_NAMESPACE}1 ${TEST_NAMESPACE}2 ${TEST_NAMESPACE}3 ${TEST_NAMESPACE}4 ${TEST_NAMESPACE}5 ${TEST_NAMESPACE}6`);
      expect(shape._namespaced).toBe(true);
    });
  });

  it('should not call anything if already namespaced', () => {
    expect.hasAssertions();

    const shape = createShape(true, true, true);
    spyOn(xpath, 'useNamespaces');

    shape.setNamespace('123');

    expect(xpath.useNamespaces).not.toHaveBeenCalled();
  });

  it('should not call anything if shape has no namespaceIds and namespaceClassnames', () => {
    expect.hasAssertions();

    const shape = createShape(false, false, false);
    spyOn(xpath, 'useNamespaces');

    shape.setNamespace('123');

    expect(xpath.useNamespaces).not.toHaveBeenCalled();
  });
});

describe('testing resetNamespace()', () => {
  it('should not change _namespaced if it is already not namespaced', () => {
    expect.hasAssertions();

    const shape = new SVGShape(TEST_FILE, TEST_SPRITER);
    shape._namespaced = false;
    shape.resetNamespace();

    expect(shape._namespaced).toBe(false);
  });

  it('should not change _namespaced if this.spriter.config.svg.namespaceIDs is falsy', () => {
    expect.hasAssertions();

    const shape = new SVGShape(TEST_FILE, TEST_SPRITER);
    shape.spriter.config.svg.namespaceIDs = false;
    shape._namespaced = true;
    shape.resetNamespace();

    expect(shape._namespaced).toBe(true);
  });

  it('should change _namespaced if it is namespaced and this.spriter.config.svg.namespaceIDs is truthy', () => {
    expect.hasAssertions();

    const shape = new SVGShape(TEST_FILE, TEST_SPRITER);
    shape.spriter.config.svg.namespaceIDs = true;
    shape._namespaced = true;
    shape.svg.ready = TEST_FILE.contents.toString();
    shape.resetNamespace();

    expect(shape._namespaced).toBe(false);
  });
});
