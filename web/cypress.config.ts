import { defineConfig } from 'cypress';
import fs from 'node:fs';
import path from 'node:path';

// URL de la API local (docker compose + `npm run dev` en api/). El front la consume
// directamente vía VITE_API_URL, así que las pruebas usan la misma base.
const API_URL = process.env.CYPRESS_API_URL || 'http://localhost:4000';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 8000,
    // Mitiga la inestabilidad documentada del lector PDF (TESTPLAN §13).
    retries: { runMode: 2, openMode: 0 },
    env: {
      apiUrl: API_URL,
      seedEditorEmail: 'editor@libroclaro.test',
      seedEditorPassword: 'editor1234',
    },
    setupNodeEvents(on) {
      // La subida de libros es multipart/form-data. Construirla en el navegador
      // choca con CORS y el origen del AUT; en cambio, este task la ejecuta en
      // Node (fetch/FormData/Blob globales en Node 18+), idéntico al docker local.
      on('task', {
        async seedBook(params: {
          apiUrl: string;
          token: string;
          subjectId: string;
          gradeId: string;
          title: string;
          schoolYear: string;
          publish: boolean;
        }) {
          const pdf = fs.readFileSync(path.resolve('cypress/fixtures/sample.pdf'));
          const fd = new FormData();
          fd.append('title', params.title);
          fd.append('description', 'Libro de prueba E2E para Cypress.');
          fd.append('schoolYear', params.schoolYear);
          fd.append('subjectId', params.subjectId);
          fd.append('gradeLevelId', params.gradeId);
          fd.append('pdf', new Blob([pdf], { type: 'application/pdf' }), 'sample.pdf');

          const res = await fetch(`${params.apiUrl}/api/books`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${params.token}` },
            body: fd,
          });
          const json = (await res.json()) as { book?: { id: string }; error?: string };
          if (!res.ok || !json.book) {
            throw new Error(`seedBook falló (${res.status}): ${JSON.stringify(json)}`);
          }
          let book = json.book;

          if (params.publish) {
            const r2 = await fetch(`${params.apiUrl}/api/books/${book.id}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${params.token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ hidden: false }),
            });
            const j2 = (await r2.json()) as { book?: { id: string }; error?: string };
            if (!r2.ok || !j2.book) {
              throw new Error(`Publicar libro falló (${r2.status}): ${JSON.stringify(j2)}`);
            }
            book = j2.book;
          }

          return book;
        },
      });
    },
  },
});
