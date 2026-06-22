import { render } from '@testing-library/react';
import { MarkdownPreview } from './MarkdownPreview';

function html(source: string, keepMarkers = false): string {
  const { container } = render(<MarkdownPreview source={source} keepMarkers={keepMarkers} />);
  return container.innerHTML;
}

describe('MarkdownPreview', () => {
  it('renderiza negrita, itálica y código', () => {
    const out = html('Texto **fuerte**, *suave* y `code`.');
    expect(out).toContain('<strong>fuerte</strong>');
    expect(out).toContain('<em>suave</em>');
    expect(out).toContain('<code');
    expect(out).toContain('code</code>');
  });

  it('renderiza encabezados según el nivel', () => {
    expect(html('# Título')).toContain('<h1');
    expect(html('### Sub')).toContain('<h3');
  });

  it('renderiza listas con viñetas', () => {
    const out = html('- uno\n- dos');
    expect(out).toContain('<ul');
    expect(out.match(/<li>/g)).toHaveLength(2);
  });

  it('renderiza enlaces con target _blank', () => {
    const out = html('Ver [aquí](https://ejemplo.com)');
    expect(out).toContain('href="https://ejemplo.com"');
    expect(out).toContain('target="_blank"');
  });

  it('escapa HTML para prevenir XSS', () => {
    const out = html('<img src=x onerror=alert(1)>');
    expect(out).not.toContain('<img src=x');
    expect(out).toContain('&lt;img');
  });

  it('con keepMarkers muestra los marcadores de formato atenuados', () => {
    const out = html('**negrita**', true);
    // Se conservan los asteriscos dentro de un span gris
    expect(out).toContain('color:#9ca3af');
    expect(out).toContain('**');
  });

  it('sin keepMarkers no muestra los asteriscos', () => {
    const out = html('**negrita**', false);
    expect(out).not.toContain('**');
    expect(out).toContain('<strong>negrita</strong>');
  });

  it('cierra la lista al encontrar un encabezado después de viñetas', () => {
    const out = html('- item\n# Después');
    expect(out).toContain('</ul>');
    expect(out).toContain('<h1');
  });

  it('inserta un separador para líneas en blanco entre párrafos', () => {
    const out = html('uno\n\ndos');
    expect(out).toContain('height:0.4em');
    expect(out.match(/<p /g)).toHaveLength(2);
  });

  it('cierra la lista cuando sigue un párrafo normal', () => {
    const out = html('- item\ntexto suelto');
    expect(out).toContain('</ul>');
    expect(out).toContain('<p');
  });
});
