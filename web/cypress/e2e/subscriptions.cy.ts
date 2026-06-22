/// <reference types="cypress" />

// P0/P1 — Suscripciones: checkout simulado Gratuito→Pro, facturas y desbloqueo
// de la descarga del PDF anotado.
describe('Suscripciones y facturas (P0/P1)', () => {
  let bookId: string;
  let docente: { email: string; password: string };

  before(() => {
    cy.apiLogin(Cypress.env('seedEditorEmail'), Cypress.env('seedEditorPassword')).then(({ token }) => {
      cy.seedBook(token, { title: `Suscripción E2E ${Date.now()}`, publish: true }).then((book) => {
        bookId = book.id;
      });
    });
  });

  beforeEach(() => {
    cy.registerDocente().then((d) => {
      docente = { email: d.email, password: d.password };
      cy.loginAs(d.email, d.password);
      cy.visit('/subscriptions');
      cy.contains('Planes de suscripción').should('be.visible');
    });
  });

  it('muestra los tres planes disponibles', () => {
    cy.get('[data-testid=plan-card-GRATUITO]').should('be.visible');
    cy.get('[data-testid=plan-card-PRO]').should('be.visible');
    cy.get('[data-testid=plan-card-INSTITUCIONAL]').should('be.visible');
  });

  it('contrata el plan Pro y habilita la descarga anotada y la factura', () => {
    cy.get('[data-testid=plan-select-PRO]').click();
    cy.get('[data-testid=checkout-card-number]').type('4242424242424242');
    cy.get('[data-testid=checkout-card-holder]').type('Docente E2E');
    cy.get('[data-testid=checkout-card-expiry]').type('12/29');
    cy.get('[data-testid=checkout-card-cvc]').type('123');
    cy.get('[data-testid=checkout-confirm]').click();

    cy.get('[data-testid=subscriptions-success]').should('contain.text', 'PRO');
    cy.get('[data-testid=plan-select-PRO]').should('be.disabled').and('contain.text', 'Plan actual');

    // Factura generada
    cy.get('[data-testid=subscriptions-invoices-link]').click();
    cy.location('pathname').should('eq', '/subscriptions/invoices');
    cy.get('[data-testid=invoice-row]').should('have.length.at.least', 1);

    // La descarga del PDF anotado queda habilitada para Pro.
    cy.visit(`/books/${bookId}/read`);
    cy.get('[data-testid=reader-download-annotated]').should('be.enabled');
  });
});
