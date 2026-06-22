/// <reference types="cypress" />

// P1 — Anotaciones del editor. El alta por arrastre depende del canvas PDF
// (inestable en headless), así que el CRUD se ejerce vía API real y la UI del
// panel de edición se valida sin depender del render del PDF.
describe('Anotaciones del editor (P1)', () => {
  const apiUrl = Cypress.env('apiUrl');

  function authHeader(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  it('crea, edita y elimina una anotación (CRUD vía API)', () => {
    cy.apiLogin(Cypress.env('seedEditorEmail'), Cypress.env('seedEditorPassword')).then((editor) => {
      cy.seedBook(editor.token, { title: `Anotaciones E2E ${Date.now()}`, publish: true }).then((book) => {
        // Crear (ERROR)
        cy.createAnnotation(editor.token, book.id, { kind: 'ERROR', content: '**Error** detectado.' }).then((ann) => {
          cy.request({
            url: `${apiUrl}/api/books/${book.id}/annotations?page=1`,
            headers: authHeader(editor.token),
          }).then((res) => {
            const annotations = (res.body as { annotations: Array<{ id: string; kind: string }> }).annotations;
            expect(annotations.map((a) => a.id)).to.include(ann.id);
            expect(annotations.find((a) => a.id === ann.id)?.kind).to.eq('ERROR');
          });

          // Editar (ERROR_PARCIAL)
          cy.request({
            method: 'PATCH',
            url: `${apiUrl}/api/annotations/${ann.id}`,
            headers: authHeader(editor.token),
            body: { kind: 'ERROR_PARCIAL', content: '*Error parcial* corregido.' },
          })
            .its('status')
            .should('eq', 200);

          cy.request({
            url: `${apiUrl}/api/books/${book.id}/annotations?page=1`,
            headers: authHeader(editor.token),
          }).then((res) => {
            const annotations = (res.body as { annotations: Array<{ id: string; kind: string }> }).annotations;
            expect(annotations.find((a) => a.id === ann.id)?.kind).to.eq('ERROR_PARCIAL');
          });

          // Eliminar
          cy.request({
            method: 'DELETE',
            url: `${apiUrl}/api/annotations/${ann.id}`,
            headers: authHeader(editor.token),
          })
            .its('status')
            .should('be.oneOf', [200, 204]);

          cy.request({
            url: `${apiUrl}/api/books/${book.id}/annotations?page=1`,
            headers: authHeader(editor.token),
          }).then((res) => {
            const annotations = (res.body as { annotations: Array<{ id: string }> }).annotations;
            expect(annotations.map((a) => a.id)).to.not.include(ann.id);
          });
        });
      });
    });
  });

  it('carga el panel de edición con sus controles', () => {
    cy.apiLogin(Cypress.env('seedEditorEmail'), Cypress.env('seedEditorPassword')).then((editor) => {
      const title = `Panel Edición E2E ${Date.now()}`;
      cy.seedBook(editor.token, { title, publish: true }).then((book) => {
        cy.loginAs(Cypress.env('seedEditorEmail'), Cypress.env('seedEditorPassword'));
        cy.visit(`/editor/books/${book.id}`);
        cy.contains(title).should('be.visible');
        cy.get('[data-testid=annotation-draw-toggle]').should('be.visible');
        cy.contains('Anotaciones en esta página').should('be.visible');
      });
    });
  });
});
