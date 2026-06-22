// Mock mínimo de react-pdf: jsdom no puede renderizar PDFs reales.
import type { ReactNode } from 'react';

export function Document({ children }: { children?: ReactNode }) {
  return <div data-testid="pdf-document">{children}</div>;
}

export function Page() {
  return <div data-testid="pdf-page" />;
}

export const pdfjs = { GlobalWorkerOptions: { workerSrc: '' }, version: 'mock' };
