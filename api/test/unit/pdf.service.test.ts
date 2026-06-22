import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { PDFDocument, StandardFonts } from 'pdf-lib';

jest.mock('../../src/config/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { getPageCount, buildAnnotatedPdf, generateCoverPng } from '../../src/services/pdf.service';

let tmpDir: string;
let samplePdf: string;

/** Genera un PDF de prueba con N páginas usando pdf-lib (sin binarios nativos). */
async function makeSamplePdf(filePath: string, pages: number): Promise<void> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const page = pdf.addPage([595, 842]); // A4
    page.drawText(`Página ${i + 1}`, { x: 50, y: 800, size: 18, font });
  }
  await fs.writeFile(filePath, await pdf.save());
}

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'libroclaro-pdf-test-'));
  samplePdf = path.join(tmpDir, 'sample.pdf');
  await makeSamplePdf(samplePdf, 3);
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('getPageCount', () => {
  it('devuelve el número de páginas del PDF', async () => {
    expect(await getPageCount(samplePdf)).toBe(3);
  });
});

describe('buildAnnotatedPdf', () => {
  it('genera un PDF válido con páginas adicionales para las anotaciones', async () => {
    const outPath = path.join(tmpDir, 'annotated.pdf');
    await buildAnnotatedPdf(samplePdf, outPath, [
      {
        page: 1,
        kind: 'ERROR',
        x: 0.1,
        y: 0.1,
        width: 0.3,
        height: 0.05,
        content: '**Corrección:** el dato es incorrecto. Ver [fuente](https://x.com).',
      },
      {
        page: 2,
        kind: 'ERROR_PARCIAL',
        x: 0.2,
        y: 0.5,
        width: 0.4,
        height: 0.04,
        content: 'Aclaración parcial sobre el contenido.',
      },
    ]);
    const pages = await getPageCount(outPath);
    // 3 originales + al menos 1 página de anotaciones
    expect(pages).toBeGreaterThan(3);
  });

  it('sin anotaciones conserva el número de páginas original', async () => {
    const outPath = path.join(tmpDir, 'annotated-empty.pdf');
    await buildAnnotatedPdf(samplePdf, outPath, []);
    expect(await getPageCount(outPath)).toBe(3);
  });
});

describe('generateCoverPng', () => {
  it('produce un PNG válido (usa el placeholder con sharp si pdf2pic no está disponible)', async () => {
    const outPath = path.join(tmpDir, 'cover.png');
    await generateCoverPng(samplePdf, outPath, 'Mi Libro de Prueba');
    const buf = await fs.readFile(outPath);
    // Firma PNG: 89 50 4E 47
    expect(buf.subarray(0, 4).toString('hex')).toBe('89504e47');
    expect(buf.length).toBeGreaterThan(0);
  }, 30000);
});
