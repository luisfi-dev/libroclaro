/// <reference types="cypress" />

// P1 — Catálogo: cuadrícula por grado, buscador y filtros.
describe('Catálogo y filtros (P1)', () => {
  const suffix = `${Date.now()}`;
  const mathTitle = `Álgebra E2E ${suffix}`;
  const spanishTitle = `Lectura E2E ${suffix}`;

  let docente: { email: string; password: string };

  before(() => {
    // Un editor siembra dos libros publicados de materia y grado distintos.
    cy.apiLogin(Cypress.env('seedEditorEmail'), Cypress.env('seedEditorPassword')).then(({ token }) => {
      cy.seedBook(token, { title: mathTitle, subjectName: 'Matemáticas', gradeName: '1° Primaria', publish: true });
      cy.seedBook(token, { title: spanishTitle, subjectName: 'Español', gradeName: '2° Primaria', publish: true });
    });
    cy.registerDocente().then((d) => {
      docente = { email: d.email, password: d.password };
    });
  });

  beforeEach(() => {
    cy.loginAs(docente.email, docente.password);
    cy.visit('/');
    cy.contains('Catálogo de libros').should('be.visible');
  });

  it('muestra los libros publicados en la cuadrícula', () => {
    cy.get('[data-testid=book-card]').should('have.length.at.least', 2);
    cy.contains(mathTitle).should('be.visible');
    cy.contains(spanishTitle).should('be.visible');
  });

  it('filtra por el buscador de título', () => {
    cy.get('[data-testid=catalog-search]').type(`Álgebra E2E ${suffix}`);
    cy.contains(mathTitle).should('be.visible');
    cy.contains(spanishTitle).should('not.exist');
  });

  it('filtra por materia', () => {
    cy.get('[data-testid=catalog-filter-subject]').click();
    cy.get('ul[role=listbox] li').contains('Español').click();

    cy.contains(spanishTitle).should('be.visible');
    cy.contains(mathTitle).should('not.exist');
  });

  it('muestra el aviso de "sin resultados"', () => {
    cy.get('[data-testid=catalog-search]').type(`zzz-inexistente-${suffix}`);
    cy.get('[data-testid=catalog-empty]').should('be.visible');
  });

  it('permite al editor ver el conmutador de libros ocultos', () => {
    cy.loginAs(Cypress.env('seedEditorEmail'), Cypress.env('seedEditorPassword'));
    cy.visit('/');
    cy.get('[data-testid=catalog-toggle-hidden]').should('be.visible').click();
    cy.get('[data-testid=catalog-toggle-hidden]').should('contain.text', 'Mostrando libros ocultos');
  });
});
