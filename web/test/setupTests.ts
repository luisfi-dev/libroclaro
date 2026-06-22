import '@testing-library/jest-dom';

// `import.meta` simulado para Jest (ver babel.config.cjs). En tests usamos rutas
// relativas (VITE_API_URL vacío), igual que en desarrollo con el proxy de Vite.
(globalThis as unknown as { __IMPORT_META__: unknown }).__IMPORT_META__ = {
  env: {
    VITE_API_URL: '',
    VITE_API_PROXY: 'http://localhost:4000',
    MODE: 'test',
    DEV: false,
    PROD: false,
  },
};

// matchMedia no existe en jsdom; algunos componentes de MUI lo consultan.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});
