/**
 * Configuración de Jest para la API de LibroClaro.
 *
 * Dos "projects":
 *  - unit:        pruebas con Prisma/Mongoose mockeados, sin BD. Rápidas.
 *  - integration: pruebas con Supertest contra los contenedores Postgres y Mongo
 *                 de `docker compose` (ver test/integration/globalSetup.ts).
 *
 * `npm test`                 → ambos projects (requiere docker para integration)
 * `npm run test:unit`        → solo unit
 * `npm run test:integration` → solo integration
 */
const tsJestTransform = {
  '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
};

/** @type {import('jest').Config} */
module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
    // Wiring declarativo (definición de routers) y bootstrap: se ejercitan
    // end-to-end en cada prueba de integración pero no contienen lógica propia.
    '!src/routes/**',
    '!src/app.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  // Gates alineados con el TESTPLAN §6/§12 (dominio ≥90%, app ≥80%, global ≥75%).
  coverageThreshold: {
    global: { statements: 75, lines: 75, functions: 75, branches: 55 },
    './src/services/': { statements: 90, lines: 90 },
    './src/middleware/': { statements: 80, lines: 80 },
  },
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      transform: tsJestTransform,
      setupFiles: ['<rootDir>/test/setupEnv.unit.ts'],
      testMatch: ['<rootDir>/test/unit/**/*.test.ts'],
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      transform: tsJestTransform,
      setupFiles: ['<rootDir>/test/setupEnv.integration.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/integration/setupAfterEnv.ts'],
      testMatch: ['<rootDir>/test/integration/**/*.test.ts'],
      globalSetup: '<rootDir>/test/integration/globalSetup.ts',
      globalTeardown: '<rootDir>/test/integration/globalTeardown.ts',
      maxWorkers: 1,
    },
  ],
};
