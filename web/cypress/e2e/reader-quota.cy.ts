/// <reference types="cypress" />

// P0 — Cuota Free (20 correcciones/mes). Enfoque pragmático: el agotamiento se
// ejerce vía API (reveal) y la UI se valida sin depender del render del PDF.
describe('Lector y cuota Free (P0)', () => {
  it('descuenta la cuota y corta en la corrección 21', () => {
    cy.apiLogin(Cypress.env('seedEditorEmail'), Cypress.env('seedEditorPassword')).then((editor) => {
      cy.seedBook(editor.token, { title: `Cuota E2E ${Date.now()}`, publish: true }).then((book) => {
        const annotationIds: string[] = [];
        // 21 anotaciones distintas: la cuota cuenta vistas únicas por anotación.
        Cypress._.times(21, (i) => {
          cy.createAnnotation(editor.token, book.id, { content: `Corrección **${i + 1}**` }).then((a) =>
            annotationIds.push(a.id),
          );
        });

        cy.registerDocente().then((docente) => {
          cy.then(() => {
            annotationIds.forEach((id, idx) => {
              cy.revealAnnotation(docente.token, id).then((res) => {
                if (idx < 20) {
                  expect(res.status, `reveal #${idx + 1}`).to.eq(200);
                } else {
                  expect(res.status, 'reveal #21 (sobre el tope)').to.eq(402);
                }
              });
            });
          });

          // La cuota quedó agotada: 20 usadas, 0 restantes.
          cy.request({
            url: `${Cypress.env('apiUrl')}/api/books/${book.id}/annotations?page=1`,
            headers: { Authorization: `Bearer ${docente.token}` },
          }).then((res) => {
            const quota = (res.body as { quota: { used: number; remaining: number; unlimited: boolean } }).quota;
            expect(quota.unlimited).to.eq(false);
            expect(quota.used).to.eq(20);
            expect(quota.remaining).to.eq(0);
          });

          // UI (sin depender del canvas): el plan Gratuito no descarga el PDF anotado.
          cy.loginAs(docente.email, docente.password);
          cy.visit(`/books/${book.id}/read`);
          cy.contains('Cuota E2E').should('be.visible');
          cy.get('[data-testid=reader-download-annotated]').should('be.disabled');
          cy.get('[data-testid=reader-download-original]').should('be.enabled');
        });
      });
    });
  });
});
