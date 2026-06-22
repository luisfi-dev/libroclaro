import { PDFDocument } from 'pdf-lib';
import {
  embedMarkdownFonts,
  renderMarkdown,
  type RenderLineCursor,
} from '../../src/services/markdownPdf.service';

/**
 * markdownPdf.service usa pdf-lib (JS puro, sin binarios nativos), por lo que se
 * puede ejercitar de verdad sin docker. Construimos un PDFDocument real y
 * verificamos que el renderizado avanza el cursor y maneja saltos de página.
 */
async function buildContext() {
  const pdf = await PDFDocument.create();
  const fonts = await embedMarkdownFonts(pdf);
  const marginX = 50;
  const marginY = 50;
  const first = pdf.addPage();
  let cursor: RenderLineCursor = { page: first, y: first.getHeight() - marginY };
  const ctx = {
    pdf,
    fonts,
    marginX,
    marginY,
    contentWidth: () => cursor.page.getWidth() - marginX * 2,
    newPage: () => {
      const page = pdf.addPage();
      cursor = { page, y: page.getHeight() - marginY };
      return cursor;
    },
  };
  return { pdf, ctx, cursor, marginY };
}

describe('embedMarkdownFonts', () => {
  it('incrusta las cinco fuentes estándar', async () => {
    const pdf = await PDFDocument.create();
    const fonts = await embedMarkdownFonts(pdf);
    expect(fonts.regular).toBeDefined();
    expect(fonts.bold).toBeDefined();
    expect(fonts.italic).toBeDefined();
    expect(fonts.boldItalic).toBeDefined();
    expect(fonts.mono).toBeDefined();
  });
});

describe('renderMarkdown', () => {
  it('renderiza formato inline, encabezados y listas avanzando el cursor', async () => {
    const { ctx, cursor } = await buildContext();
    const md = [
      '# Título principal',
      'Texto con **negrita**, *itálica*, `código` y un [enlace](https://ejemplo.com).',
      '',
      '- Primer ítem',
      '- Segundo ítem con **énfasis**',
    ].join('\n');

    const startY = cursor.y;
    const result = renderMarkdown(ctx, cursor, md, { baseFontSize: 11 });
    expect(result.y).toBeLessThan(startY);
    expect(result.page).toBeDefined();
  });

  it('normaliza acentos (NFC) sin lanzar con fuentes WinAnsi', async () => {
    const { ctx, cursor } = await buildContext();
    // "á" en forma descompuesta (a + acento combinante)
    const descompuesto = 'Corrección con acentos: árbol, niño';
    expect(() => renderMarkdown(ctx, cursor, descompuesto)).not.toThrow();
  });

  it('crea páginas nuevas cuando el contenido desborda', async () => {
    const { pdf, ctx, cursor } = await buildContext();
    const largo = Array.from({ length: 120 }, (_, i) => `Línea de párrafo número ${i} con texto suficiente.`).join('\n');
    renderMarkdown(ctx, cursor, largo);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });

  it('una cadena vacía no rompe y devuelve un cursor válido', async () => {
    const { ctx, cursor } = await buildContext();
    const result = renderMarkdown(ctx, cursor, '');
    expect(result.page).toBeDefined();
  });
});
