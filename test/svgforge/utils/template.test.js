import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {renderTemplate} from '../../../lib/svgforge/utils/template.js';

const temporaryPath = fs.mkdtempSync(path.join(os.tmpdir(), 'svgforge-template-'));

const writeTemplate = (name, source) => {
  const file = path.join(temporaryPath, name);
  fs.writeFileSync(file, source, 'utf8');
  return file;
};

describe('testing renderTemplate()', () => {
  it('should render a template file with data', async () => {
    const out = await renderTemplate(writeTemplate('plain.vto', 'Hello {{ name }}'), {name: 'world'});

    assert.strictEqual(out, 'Hello world');
  });

  it('should HTML-escape values by default', async () => {
    const out = await renderTemplate(writeTemplate('escape.vto', '{{ value }}'), {value: '<b>&"\'</b>'});

    assert.strictEqual(out, '&lt;b&gt;&amp;&quot;&apos;&lt;/b&gt;');
  });

  it('should support if / for / pipes', async () => {
    const source = '<ul>{{ for s of shapes }}<li class="{{ if s.active }}on{{ else }}off{{ /if }}">{{ s.name }}</li>{{ /for }}</ul>{{ markup |> safe }}';
    const out = await renderTemplate(writeTemplate('loop.vto', source), {
      shapes: [{name: 'a', active: true}, {name: 'b', active: false}],
      markup: '<b>x</b>',
    });

    assert.strictEqual(out, '<ul><li class="on">a</li><li class="off">b</li></ul><b>x</b>');
  });

  it('should resolve shared includes through the loader', async () => {
    const source = '{{ import { footer } from "footer.vto" }}{{ footer() }}{{ include "preview.js" }}';
    const out = await renderTemplate(writeTemplate('includes.vto', source), {date: '2026-01-01'});

    assert.ok(out.includes('Generated at 2026-01-01 by'));
    assert.ok(out.includes('function onCopied'));
  });

  it('should call data functions directly', async () => {
    const out = await renderTemplate(writeTemplate('function.vto', '{{ double(x) }}'), {x: 4, double: value => value * 2});

    assert.strictEqual(out, '8');
  });

  it('should reject when the template file is missing', async () => {
    await assert.rejects(() => renderTemplate(path.join(temporaryPath, 'missing.vto'), {}), {code: 'ENOENT'});
  });
});
