/**
 Svgforge is a Node.js module for creating SVG sprites

 @see https://github.com/svgforge/svgforge
 @author svgforge (https://github.com/SpotlightOn)
 @copyright © 2026 svgforge
 @license MIT https://github.com/svgforge/svgforge/blob/main/LICENSE
 */

import cssom from 'cssom';
import {createParser} from 'css-selector-parser';
import {getDependency} from '../../deps.js';

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

  return selectors ? this._replaceIdAndClassnameReferencesInCssSelectors(string_, getDependency('cssom', cssom).parse(string_).cssRules, substIds, substClassnames) : string_;
}

/**
 Recursively replace ID and class references in CSS selectors

 @param {string} string_ Original CSS text
 @param {Array} rules Parsed CSS rule objects
 @param {object} substIds ID substitutions
 @param {object} substClassnames Class name substitutions
 @returns {string} Substituted CSS text
*/
export function _replaceIdAndClassnameReferencesInCssSelectors(string_, rules, substIds, substClassnames) {
  let css = '';

  for (const rule of rules) {
    if (rule.constructor.name === 'CSSFontFaceRule') {
      css += `@font-face${string_.slice(rule.__starts + 1, rule.__ends)}`; // Preserving @font-face rule
      continue;
    }

    let selText = rule.selectorText;

    // @-rule
    if (selText === undefined) {
    // If there's a key text: Copy the CSS rule
      if (rule.keyText) {
        css += string_.slice(rule.__starts, rule.__starts + rule.__ends);

      // Else: Recursively process rule content
      } else if (Array.isArray(rule.cssRules)) {
        const from = string_.slice(rule.__starts, rule.cssRules[0].__starts);
        const middle = this._replaceIdAndClassnameReferencesInCssSelectors(string_, rule.cssRules, substIds, substClassnames);
        const to = string_.slice(rule.cssRules.at(-1).__ends, rule.__ends);
        css += from + middle + to;
      }

    // Regular selector
    } else {
      const origSelText = selText;
      const parse = createParser();
      const selector = parse(selText);
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

      for (const selectorRule of selector.rules) {
        collectRule(selectorRule);
      }

      // Substitute IDs within the selector
      if (ids.length > 0) {
        const sortedIds = ids.toSorted((a, b) => b.length - a.length);

        for (const id of sortedIds) {
          selText = selText.split(`#${id}`).join(`#${substIds[`#${id}`]}`);
        }
      }

      // Substitute class names within the selector
      if (classnames.size > 0) {
        const sortedClassnames = [...classnames].toSorted((a, b) => b.length - a.length);
        for (const classname of sortedClassnames) {
          selText = selText.split(`.${classname}`).join(`.${substClassnames[`.${classname}`]}`);
        }
      }

      // Rebuild the selector
      css += selText + string_.slice(rule.__starts + origSelText.length, rule.__ends);
    }
  }

  return css;
}
