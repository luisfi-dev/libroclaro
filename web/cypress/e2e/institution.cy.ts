/// <reference types="cypress" />

// P1 — Panel de Institución: renombrar y CRUD de miembros docentes.
describe('Panel de institución (P1)', () => {
  let admin: { email: string; password: string };

  beforeEach(() => {
    cy.registerDocente().then((d) => {
      admin = { email: d.email, password: d.password };
      cy.subscribe(d.token, {
        plan: 'INSTITUCIONAL',
        institutionName: `Institución E2E ${Date.now()}`,
        cardNumber: '4242424242424242',
        cardHolder: 'Admin E2E',
        cardExpiry: '12/29',
        cardCvc: '123',
      });
      cy.loginAs(d.email, d.password);
      cy.visit('/institution');
      cy.contains('Mi institución').should('be.visible');
    });
  });

  it('renombra la institución', () => {
    const newName = `Institución Renombrada ${Date.now()}`;
    cy.get('[data-testid=institution-name]').clear().type(newName);
    cy.get('[data-testid=institution-save]').click();

    // Tras guardar, el formulario se sincroniza con el nombre persistido.
    cy.get('[data-testid=institution-save]').should('be.disabled');
    cy.get('[data-testid=institution-name]').should('have.value', newName);
  });

  it('crea, edita y elimina un miembro docente', () => {
    const memberEmail = `miembro.${Date.now()}@e2e.test`;

    // Crear
    cy.get('[data-testid=member-new]').click();
    cy.get('[data-testid=member-fullname]').type('Miembro Uno E2E');
    cy.get('[data-testid=member-email]').type(memberEmail);
    cy.get('[data-testid=member-birthdate]').type('1992-03-03');
    cy.get('[data-testid=member-password]').type('miembro1234');
    cy.get('[data-testid=member-save]').click();
    cy.contains('[data-testid=member-row]', memberEmail).should('be.visible');

    // Editar
    cy.contains('[data-testid=member-row]', memberEmail).within(() => {
      cy.get('[data-testid=member-edit]').click();
    });
    cy.get('[data-testid=member-fullname]').clear().type('Miembro Editado E2E');
    cy.get('[data-testid=member-save]').click();
    cy.contains('[data-testid=member-row]', memberEmail).should('contain.text', 'Miembro Editado E2E');

    // Eliminar (confirm nativo)
    cy.on('window:confirm', () => true);
    cy.contains('[data-testid=member-row]', memberEmail).within(() => {
      cy.get('[data-testid=member-delete]').click();
    });
    cy.contains('[data-testid=member-row]', memberEmail).should('not.exist');
  });
});
