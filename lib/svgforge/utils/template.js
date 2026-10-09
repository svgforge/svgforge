/**
 Template rendering wrapper around Vento (ventojs)

 svgforge renders its HTML example documents and stylesheet resources from
 Vento template files. The files are loaded by Vento itself: `{{ layout }}`,
 `{{ include }}` and `{{ import }}` resolve through the loader, and bare names
 are looked up relative to the shared `tmpl/common` folder. Callers therefore
 only pass a file path -- no manual file reading.

 Vento's bundled file loader cannot resolve absolute paths outside its root,
 which the user-configured example and stylesheet templates need; the small
 loader subclass below lets absolute paths pass through unchanged.
 */

import path from 'node:path';
import {fileURLToPath} from 'node:url';
import createVento from 'ventojs';
import {FileLoader} from 'ventojs/loaders/file.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sharedTemplatesPath = path.resolve(packageRoot, 'tmpl', 'common');

/**
 Vento loader: bare names resolve against `tmpl/common`, absolute paths load as-is
 */
class TemplateLoader extends FileLoader {
  resolve(from, file) {
    return path.isAbsolute(file) ? file : super.resolve(from, file);
  }
}

/**
 Render a Vento template file

 @param {string} file Template file path
 @param {object} data Data passed to the template
 @returns {Promise<string>} Rendered output
 */
export async function renderTemplate(file, data) {
  const env = createVento({
    includes: new TemplateLoader(sharedTemplatesPath),
    autoescape: true,
  });

  const {content} = await env.run(file, data);

  return content;
}
