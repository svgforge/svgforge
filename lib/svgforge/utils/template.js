/**
 Template rendering wrapper around Vento (ventojs)

 svgforge uses Vento for rendering its HTML example documents and stylesheet
 resources. Templates live as `.vto` files in `tmpl/`; shared partials
 (`figcaption`, `preview-css`, …) are passed in as a name → source map and
 served to Vento through an in-memory loader, so the library can render
 templates from arbitrary (user-provided) paths without a fixed file root.
 */

import createVento from 'ventojs';

/**
 In-memory Vento loader for partial templates

 @class
 */
class InMemoryLoader {
  /**
   Create the in-memory loader

   @param {object} files Partial templates keyed by name
   */
  constructor(files) {
    this.files = new Map(Object.entries(files));
  }

  /**
   Load a partial template

   @param {string} file Template name
   @returns {Promise<{source: string}>} Template source
   */
  async load(file) {
    const source = this.files.get(file);
    if (source === undefined) {
      throw new Error(`Partial template not found: ${file}`);
    }

    return {source};
  }

  /**
   Resolve a template name (names are used verbatim as loader keys)

   @param {string} _from Unused (kept for Vento's loader interface)
   @param {string} file Template name
   @returns {string} Resolved name
   */
  resolve(_from, file) {
    return file;
  }
}

/**
 Render a Vento template

 @param {string} template Template source code
 @param {object} data Data passed to the template
 @param {object} [partials] Partial templates keyed by name
 @returns {Promise<string>} Rendered output
 */
export async function renderTemplate(template, data, partials = {}) {
  const env = createVento({
    includes: new InMemoryLoader(partials),
    autoescape: true,
  });

  const compiled = env.compile(template, 'sprite');
  const result = await compiled(data);

  return result.content;
}
