
/**
 Svg-sprite is a Node.js module for creating SVG sprites

 @see https://github.com/svg-sprite/svg-sprite
 @author Joschi Kuphal <joschi@kuphal.net> (https://github.com/jkphl)
 @copyright © 2018 Joschi Kuphal
 @license MIT https://github.com/joeda1/svgforge/blob/main/LICENSE
 */

export default class SVGSpriteCssPacker {
  /**
   CSS sprite packer

   @param {Array<SVGShape>} shapes Shapes to pack
   */
  constructor(shapes) {
    this.shapes = shapes;
    this.blocks = [];
    this.positions = [];

    for (const [index, shape] of this.shapes.entries()) {
      if (!shape.master) {
        const {width, height} = shape.getDimensions();
        this.blocks.push({index, width, height});
      }

      this.positions.push({x: 0, y: 0});
    }

    this.blocks.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
    this.root = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  /**
   Fit and return the shapes

   @returns {Array} shapes       Packed shapes
   */

  /**
   Find a node

   @param {object} root Root node to search from
   @param {number} width Required block width
   @param {number} height Required block height
   @returns {object | null} Node
   */
  #findNode(root, width, height) {
    if (root.used) {
      return this.#findNode(root.right, width, height) || this.#findNode(root.down, width, height);
    }

    if (width <= root.width && height <= root.height) {
      return root;
    }

    return null;
  }

  /**
   Split a node

   @param {object} node Node to split
   @param {number} width Required block width
   @param {number} height Required block height
   @returns {object} node       Node
   */
  #splitNode(node, width, height) {
    node.used = true;
    node.down = {
      x: node.x,
      y: node.y + height,
      width: node.width,
      height: node.height - height,
    };
    node.right = {
      x: node.x + width,
      y: node.y,
      width: node.width - width,
      height,
    };

    return node;
  }

  /**
   Grow the sprite

   @param {number} width Additional block width
   @param {number} height Additional block height
   @returns {object|null} Node
   */
  #growNode(width, height) {
    const canGrowBottom = width <= this.root.width;
    const canGrowRight = height <= this.root.height;

    if (canGrowRight && (this.root.height >= (this.root.width + width))) {
      return this.#growRight(width, height);
    }

    if (canGrowBottom && (this.root.width >= (this.root.height + height))) {
      return this.#growBottom(width, height);
    }

    if (canGrowRight) {
      return this.#growRight(width, height);
    }

    if (canGrowBottom) {
      return this.#growBottom(width, height);
    }

    return null;
  }

  /**
   Grow the sprite to the right

   @param {number} width Additional block width
   @param {number} height Additional block height
   @returns {object|false} Node
   */
  #growRight(width, height) {
    this.root = {
      used: true,
      x: 0,
      y: 0,
      width: this.root.width + width,
      height: this.root.height,
      down: this.root,
      right: {
        x: this.root.width,
        y: 0,
        width,
        height: this.root.height,
      },
    };
    const node = this.#findNode(this.root, width, height);

    return node ? this.#splitNode(node, width, height) : false;
  }

  /**
   Grow the sprite to the bottom

   @param {number} width Additional block width
   @param {number} height Additional block height
   @returns {object|null} Node
   */
  #growBottom(width, height) {
    this.root = {
      used: true,
      x: 0,
      y: 0,
      width: this.root.width,
      height: this.root.height + height,
      down: {
        x: 0,
        y: this.root.height,
        width: this.root.width,
        height,
      },
      right: this.root,
    };
    const node = this.#findNode(this.root, width, height);

    return node ? this.#splitNode(node, width, height) : null;
  }

  fit() {
    if (this.blocks.length === 0) {
      return [];
    }

    this.root.width = this.blocks[0].width;
    this.root.height = this.blocks[0].height;

    for (const {index, width, height} of this.blocks) {
      const node = this.#findNode(this.root, width, height);
      const {x, y} = node ? this.#splitNode(node, width, height) : this.#growNode(width, height);
      this.positions[index] = {x, y};
    }

    return this.positions;
  }
}
