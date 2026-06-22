/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  transform: {
    '^.+\\.(t|j)sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    // Alias de Vite
    '^@/(.*)$': '<rootDir>/src/$1',
    // react-pdf y su worker no se renderizan en jsdom: se mockean
    '^react-pdf$': '<rootDir>/test/__mocks__/react-pdf.tsx',
    '^.+/pdfWorker$': '<rootDir>/test/__mocks__/empty.ts',
    'pdfjs-dist': '<rootDir>/test/__mocks__/empty.ts',
    // Estilos y assets
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|svg|gif|webp|woff2?)$': '<rootDir>/test/__mocks__/fileMock.ts',
  },
  // Capa de presentación cubierta por pruebas unitarias (componentes, rutas y
  // helpers HTTP). Las páginas completas, layouts y el lector PDF se validan con
  // Cypress E2E según el TESTPLAN (sección 3.2), por lo que se excluyen aquí.
  collectCoverageFrom: [
    'src/components/MarkdownPreview.tsx',
    'src/components/MarkdownEditor.tsx',
    'src/components/AuthedImage.tsx',
    'src/routes/ProtectedRoute.tsx',
    'src/api/client.ts',
  ],
  coverageThreshold: {
    global: { statements: 70, branches: 65, functions: 70, lines: 70 },
  },
  coverageDirectory: '<rootDir>/coverage',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}', '<rootDir>/test/**/*.test.{ts,tsx}'],
};
