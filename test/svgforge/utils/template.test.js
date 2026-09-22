import {renderTemplate} from '../../../lib/svgforge/utils/template.js';
import {
  describe,
  expect,
  it,
} from '../../helpers/jest-compat.js';

describe('testing renderTemplate()', () => {
  it('should render a plain template', async () => {
    expect.hasAssertions();

    const out = await renderTemplate('Hello {{ name }}', {name: 'world'}, {});

    expect(out).toBe('Hello world');
  });

  it('should HTML-escape values by default', async () => {
    expect.hasAssertions();

    const out = await renderTemplate('{{ value }}', {value: '<b>&"\'</b>'}, {});

    expect(out).toBe('&lt;b&gt;&amp;&quot;&apos;&lt;/b&gt;');
  });

  it('should render values unescaped with |> safe', async () => {
    expect.hasAssertions();

    const out = await renderTemplate('{{ value |> safe }}', {value: '<b>x</b>'}, {});

    expect(out).toBe('<b>x</b>');
  });

  it('should support if / for / loop variables', async () => {
    expect.hasAssertions();

    const template = '<ul>{{ for s of shapes }}<li class="{{ if s.active }}on{{ else }}off{{ /if }}">{{ s.name }}</li>{{ /for }}</ul>';
    const out = await renderTemplate(template, {shapes: [{name: 'a', active: true}, {name: 'b', active: false}]}, {});

    expect(out).toBe('<ul><li class="on">a</li><li class="off">b</li></ul>');
  });

  it('should include partials passed via the loader', async () => {
    expect.hasAssertions();

    const out = await renderTemplate('{{ include "figure" }}', {label: 'x'}, {
      figure: '<figure>{{ it.label }}</figure>',
    });

    expect(out).toBe('<figure>x</figure>');
  });

  it('should import exported functions from partials', async () => {
    expect.hasAssertions();

    const out = await renderTemplate('{{ import { greet } from "greeter" }}{{ greet("A") }}', {}, {
      greeter: '{{ export function greet(name) }}Hello {{ name }}{{ /export }}',
    });

    expect(out).toBe('Hello A');
  });

  it('should call data functions directly', async () => {
    expect.hasAssertions();

    const out = await renderTemplate('{{ double(x) }}', {x: 4, double: value => value * 2}, {});

    expect(out).toBe('8');
  });

  it('should reject when a partial is missing', async () => {
    expect.hasAssertions();

    expect(() => renderTemplate('{{ include "nope" }}', {}, {}))
      .rejects.toThrow('Partial template not found: nope');
  });
});
