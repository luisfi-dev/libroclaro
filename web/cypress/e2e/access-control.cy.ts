/// <reference types="cypress" />

// P0/P1 — Control de acceso (OWASP A01): un Docente no entra a paneles de otros
// roles, y un docente institucional tiene el perfil bloqueado.
describe('Control de acceso (A01)', () => {
  it('redirige a un DOCENTE fuera de /editor', () => {
    cy.registerDocente().then(({ email, password }) => {
      cy.loginAs(email, password);
      cy.visit('/editor');
      cy.location('pathname').should('eq', '/');
      cy.contains('Catálogo de libros').should('be.visible');
    });
  });

  it('redirige a un DOCENTE fuera de /institution', () => {
    cy.registerDocente().then(({ email, password }) => {
      cy.loginAs(email, password);
      cy.visit('/institution');
      cy.location('pathname').should('eq', '/');
    });
  });

  it('bloquea la edición del perfil de un docente institucional', () => {
    // Un administrador crea una institución y un miembro docente.
    cy.registerDocente().then((admin) => {
      cy.subscribe(admin.token, {
        plan: 'INSTITUCIONAL',
        institutionName: `Inst. E2E ${Date.now()}`,
        cardNumber: '4242424242424242',
        cardHolder: 'Admin E2E',
        cardExpiry: '12/29',
        cardCvc: '123',
      });

      const memberEmail = `miembro.${Date.now()}@e2e.test`;
      const memberPassword = 'miembro1234';
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/institutions/me/members`,
        headers: { Authorization: `Bearer ${admin.token}` },
        body: {
          fullName: 'Miembro Docente E2E',
          email: memberEmail,
          birthDate: '1991-02-02',
          password: memberPassword,
        },
      }).its('status').should('eq', 201);

      cy.loginAs(memberEmail, memberPassword);
      cy.visit('/profile');

      cy.get('[data-testid=profile-locked-alert]').should('be.visible');
      cy.get('[data-testid=profile-fullname]').should('be.disabled');
      cy.get('[data-testid=profile-email]').should('be.disabled');
      cy.get('[data-testid=profile-save]').should('be.disabled');
      cy.get('[data-testid=profile-delete]').should('be.disabled');
    });
  });
});
