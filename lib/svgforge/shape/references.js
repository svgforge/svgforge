/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import {parse as parseCss, walk} from 'css-tree';
import {createParser} from 'css-selector-parser';

/**
 Replace ID and class references

 @param {string} string_ String to substitute references in
 @param {object} substIds ID substitutions
 @param {object} substClassnames Class name substitutions
 @param {boolean} selectors Substitute CSS selectors
 @returns {string} String with replaced ID and class name references
*/
export function _replaceIdAndClassnameReferences(string_, substIds, substClassnames, selectors) {
  // If ID replacement is to be applied: Replace url()-style ID references
  if (substIds !== null) {
    string_ = string_.replaceAll(/url\s*\(\s*["']?(?<id>[^\s"')]+)["']?\s*\)/gu, (match, id) => `url(${Object.hasOwn(substIds, id) ? `#${substIds[id]}` : id})`);
  }

  return selectors ? this._replaceIdAndClassnameReferencesInCssSelectors(string_, substIds, substClassnames) : string_;
}

/**
 Recursively replace ID and class references in CSS selectors

 @param {string} string_ Original CSS text
 @param {object} substIds ID substitutions
 @param {object} substClassnames Class name substitutions
 @returns {string} Substituted CSS text
*/
export function _replaceIdAndClassnameReferencesInCssSelectors(string_, substIds, substClassnames) {
  const cssTree = parseCss(string_, {positions: true});

  const selectors = [];
  const walker = node => {
    if (node.type !== 'Rule' || !node.prelude || !node.prelude.loc || (this.atrule && this.atrule.name === 'keyframes')) {
      // Keyframes (`from` / `to` / percentage steps) are not CSS selectors in
      // the classic sense and must not be touched.
      return;
    }

    selectors.push({
      text: string_.slice(node.prelude.loc.start.offset, node.prelude.loc.end.offset),
      start: node.prelude.loc.start.offset,
      end: node.prelude.loc.end.offset,
    });
  };

  walk(cssTree, {enter: walker, thisArg: this});
  const parse = createParser();

  // Process the selectors from last to first so that the previously recorded
  // text offsets stay valid while the string length changes on substitution.
  for (const selector of selectors.toReversed()) {
    let selText = selector.text;
    const parsedSelector = parse(selText);
    const ids = [];
    const classnames = new Set();
    const classnameFilter = classname => {
      if (Object.hasOwn(substClassnames, `.${classname}`)) {
        classnames.add(classname);
      }
    };

    const collectRule = selectorRule => {
      for (const item of selectorRule.items) {
        if (item.type === 'Id' && substIds !== null && Object.hasOwn(substIds, `#${item.name}`)) {
          ids.push(item.name);
        } else if (item.type === 'ClassName' && substClassnames !== null && Object.hasOwn(substClassnames, `.${item.name}`)) {
          classnameFilter(item.name);
        }
      }

      if (selectorRule.nestedRule) {
        collectRule(selectorRule.nestedRule);
      }
    };

    for (const selectorRule of parsedSelector.rules) {
      collectRule(selectorRule);
    }

    // Substitute IDs within the selector, longest first to keep prefix IDs intact
    if (ids.length > 0) {
      const sortedIds = ids.toSorted((a, b) => b.length - a.length);
      for (const id of sortedIds) {
        selText = selText.split(`#${id}`).join(`#${substIds[`#${id}`]}`);
      }
    }

    // Substitute class names within the selector, longest first to keep prefix classes intact
    if (classnames.size > 0) {
      const sortedClassnames = [...classnames].toSorted((a, b) => b.length - a.length);

      for (const classname of sortedClassnames) {
        selText = selText.split(`.${classname}`).join(`.${substClassnames[`.${classname}`]}`);
      }
    }

    if (selText !== selector.text) {
      string_ = string_.slice(0, selector.start) + selText + string_.slice(selector.end);
    }
  }

  return string_;
}
