import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { embedMarkdownFonts, renderMarkdown, type RenderLineCursor } from './markdownPdf.service';

export async function getPageCount(pdfPath: string): Promise<number> {
  const bytes = await fs.readFile(pdfPath);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return pdf.getPageCount();
}

/**
 * Renderiza la primera página del PDF como PNG. Intenta usar pdf2pic (que requiere
 * GraphicsMagick + Ghostscript). Si falla, genera una portada placeholder con sharp.
 */
export async function generateCoverPng(pdfPath: string, outPath: string, bookTitle: string): Promise<void> {
  try {
    const { fromPath } = await import('pdf2pic');
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'libroclaro-cover-'));
    const converter = fromPath(pdfPath, {
      density: 120,
      saveFilename: 'cover',
      savePath: tmpDir,
      format: 'png',
      width: 600,
      height: 800,
    });
    const result = await converter(1, { responseType: 'image' });
    const generatedPath = (result as { path?: string }).path;
    if (!generatedPath) throw new Error('pdf2pic no retornó ruta');
    await sharp(generatedPath).resize(600, 800, { fit: 'inside' }).png().toFile(outPath);
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch (err) {
    console.warn('No se pudo renderizar la portada con pdf2pic, generando placeholder:', err);
    await generatePlaceholderCover(outPath, bookTitle);
  }
}

async function generatePlaceholderCover(outPath: string, title: string): Promise<void> {
  const safeTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 60);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1e3a8a"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="40%" font-family="sans-serif" font-size="48" fill="white"
        text-anchor="middle" font-weight="bold">LibroClaro</text>
      <foreignObject x="40" y="420" width="520" height="320">
        <div xmlns="http://www.w3.org/1999/xhtml"
          style="color:white;font-family:sans-serif;font-size:28px;text-align:center;">
          ${safeTitle}
        </div>
      </foreignObject>
    </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outPath);
}

interface AnnotationForPdf {
  page: number;
  kind: 'ERROR' | 'ERROR_PARCIAL';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
}

/**
 * Genera un PDF con anotaciones integradas. Las áreas se dibujan sobre las páginas
 * originales con un número de referencia, y al final se añaden páginas con los textos.
 */
export async function buildAnnotatedPdf(
  sourcePdfPath: string,
  outPath: string,
  annotations: AnnotationForPdf[],
): Promise<void> {
  const bytes = await fs.readFile(sourcePdfPath);
  const pdf = await PDFDocument.load(bytes);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mdFonts = await embedMarkdownFonts(pdf);

  const pages = pdf.getPages();
  const sorted = [...annotations].sort((a, b) =>
    a.page === b.page ? a.y - b.y : a.page - b.page,
  );

  sorted.forEach((ann, idx) => {
    const ref = idx + 1;
    const page = pages[ann.page - 1];
    if (!page) return;
    const { width: pw, height: ph } = page.getSize();
    const color = ann.kind === 'ERROR' ? rgb(0.86, 0.16, 0.16) : rgb(0.95, 0.74, 0.14);
    const x = ann.x * pw;
    // Las coordenadas y de pdf-lib van desde abajo, las nuestras desde arriba
    const y = ph - (ann.y + ann.height) * ph;
    const w = ann.width * pw;
    const h = ann.height * ph;

    page.drawRectangle({
      x, y, width: w, height: h,
      borderColor: color,
      borderWidth: 2,
      opacity: 0.15,
      color,
    });

    page.drawText(String(ref), {
      x: Math.min(x + w + 4, pw - 20),
      y: y + h - 12,
      size: 12,
      font: boldFont,
      color,
    });
  });

  // Páginas con las anotaciones
  if (sorted.length > 0) {
    const marginX = 50;
    const marginY = 50;

    const makePage = (): RenderLineCursor => {
      const page = pdf.addPage();
      return { page, y: page.getHeight() - marginY };
    };

    let cursor = makePage();
    cursor.page.drawText('Anotaciones', {
      x: marginX,
      y: cursor.y - 16,
      size: 22,
      font: boldFont,
    });
    cursor.y -= 50;

    const ctx = {
      pdf,
      fonts: mdFonts,
      marginX,
      marginY,
      contentWidth: () => cursor.page.getWidth() - marginX * 2,
      newPage: () => {
        cursor = makePage();
        return cursor;
      },
    };

    sorted.forEach((ann, idx) => {
      const ref = idx + 1;
      const header = `**[${ref}]** _(pág. ${ann.page} · ${ann.kind === 'ERROR' ? 'Error' : 'Error parcial'})_`;
      cursor = renderMarkdown(ctx, cursor, header, { baseFontSize: 11 });
      cursor = renderMarkdown(ctx, cursor, ann.content, { baseFontSize: 11 });
      cursor.y -= 10;
    });
  }

  const out = await pdf.save();
  await fs.writeFile(outPath, out);
}
