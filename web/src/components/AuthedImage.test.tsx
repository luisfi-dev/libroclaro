import { render, screen, waitFor } from '@testing-library/react';
import { AuthedImage } from './AuthedImage';
import { setToken, clearToken } from '../api/client';

beforeAll(() => {
  // jsdom no implementa createObjectURL
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:fake-url') });
});

afterEach(() => {
  clearToken();
  jest.restoreAllMocks();
});

describe('AuthedImage', () => {
  it('carga la imagen con el header Authorization y la muestra', async () => {
    setToken('tok-123');
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['x'], { type: 'image/png' })),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    // Usamos una URL distinta por test para evitar el caché de blobs del módulo.
    render(<AuthedImage src="/api/books/1/cover" alt="portada" fallback={<span>sin portada</span>} />);

    await waitFor(() => expect(screen.getByAltText('portada')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/books/1/cover',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok-123' } }),
    );
  });

  it('muestra el fallback cuando la petición falla', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AuthedImage src="/api/books/2/cover" alt="portada2" fallback={<span>sin portada</span>} />);

    await waitFor(() => expect(screen.getByText('sin portada')).toBeInTheDocument());
  });
});
