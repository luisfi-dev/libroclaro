/// <reference types="cypress" />

// P0 — Subida de libro (Editor): formulario multipart real + publicar/ocultar.
describe('Subida de libro por el editor (P0)', () => {
  beforeEach(() => {
    cy.loginAs(Cypress.env('seedEditorEmail'), Cypress.env('seedEditorPassword'));
    cy.visit('/editor');
    cy.contains('Panel del editor').should('be.visible');
  });

  it('sube un libro nuevo y lo publica', () => {
    const title = `Libro Subido E2E ${Date.now()}`;

    cy.get('[data-testid=editor-new-book]').click();
    cy.get('[data-testid=upload-title]').type(title);
    cy.get('[data-testid=upload-description]').type('Libro subido desde la prueba E2E de Cypress.');
    cy.get('[data-testid=upload-year]').type('2025-2026');

    cy.get('[data-testid=upload-subject]').click();
    cy.get('ul[role=listbox] li').contains('Matemáticas').click();
    cy.get('[data-testid=upload-grade]').click();
    cy.get('ul[role=listbox] li').contains('1° Primaria').click();

    cy.get('[data-testid=upload-file]').selectFile('cypress/fixtures/sample.pdf', { force: true });
    cy.get('[data-testid=upload-submit]').click();

    // La generación de portada puede tardar; ampliamos el tiempo de espera.
    cy.contains('[data-testid=book-row]', title, { timeout: 30000 }).should('be.visible');

    // Por defecto el libro queda oculto; lo publicamos con el chip de estado.
    cy.contains('[data-testid=book-row]', title).within(() => {
      cy.get('[data-testid=book-toggle-hidden]').should('contain.text', 'Oculto').click();
      cy.get('[data-testid=book-toggle-hidden]').should('contain.text', 'Publicado');
    });
  });

  it('abre el panel de edición del libro desde la tabla', () => {
    const title = `Libro Editable E2E ${Date.now()}`;
    cy.apiLogin(Cypress.env('seedEditorEmail'), Cypress.env('seedEditorPassword')).then(({ token }) => {
      cy.seedBook(token, { title }).then((book) => {
        cy.visit('/editor');
        cy.contains('[data-testid=book-row]', title).within(() => {
          cy.get('[data-testid=book-edit-link]').click();
        });
        cy.location('pathname').should('eq', `/editor/books/${book.id}`);
        cy.contains(title).should('be.visible');
      });
    });
  });
});
