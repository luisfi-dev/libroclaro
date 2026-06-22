/// <reference types="cypress" />

// P0 — Autenticación: registro con validación ≥18, login, errores y logout.
describe('Autenticación (P0)', () => {
  function uniqueEmail() {
    return `docente.${Date.now()}.${Math.floor(Math.random() * 1e4)}@e2e.test`;
  }

  it('registra a un usuario ≥18 y lo lleva al catálogo', () => {
    cy.visit('/register');
    cy.get('[data-testid=register-fullname]').type('Persona Mayor E2E');
    cy.get('[data-testid=register-email]').type(uniqueEmail());
    cy.get('[data-testid=register-birthdate]').type('15/05/1990');
    cy.get('[data-testid=register-password]').type('docente1234');
    cy.get('[data-testid=register-password-confirm]').type('docente1234');
    cy.get('[data-testid=register-submit]').click();

    cy.contains('Catálogo de libros').should('be.visible');
    cy.location('pathname').should('eq', '/');
  });

  it('rechaza el registro de un menor de 18 años', () => {
    cy.visit('/register');
    cy.get('[data-testid=register-fullname]').type('Menor E2E');
    cy.get('[data-testid=register-email]').type(uniqueEmail());
    cy.get('[data-testid=register-birthdate]').type('01/01/2015');
    cy.get('[data-testid=register-password]').type('menor12345');
    cy.get('[data-testid=register-password-confirm]').type('menor12345');
    cy.get('[data-testid=register-submit]').click();

    cy.get('[data-testid=register-error]').should('be.visible');
    cy.location('pathname').should('eq', '/register');
  });

  it('rechaza el registro cuando las contraseñas no coinciden', () => {
    cy.visit('/register');
    cy.get('[data-testid=register-fullname]').type('Persona E2E');
    cy.get('[data-testid=register-email]').type(uniqueEmail());
    cy.get('[data-testid=register-birthdate]').type('15/05/1990');
    cy.get('[data-testid=register-password]').type('docente1234');
    cy.get('[data-testid=register-password-confirm]').type('otraClave999');
    cy.get('[data-testid=register-submit]').click();

    cy.get('[data-testid=register-error]').should('contain.text', 'no coinciden');
  });

  it('rechaza el registro con un correo ya existente', () => {
    cy.registerDocente().then(({ email }) => {
      cy.visit('/register');
      cy.get('[data-testid=register-fullname]').type('Duplicado E2E');
      cy.get('[data-testid=register-email]').type(email);
      cy.get('[data-testid=register-birthdate]').type('15/05/1990');
      cy.get('[data-testid=register-password]').type('docente1234');
      cy.get('[data-testid=register-password-confirm]').type('docente1234');
      cy.get('[data-testid=register-submit]').click();

      cy.get('[data-testid=register-error]').should('be.visible');
    });
  });

  it('inicia sesión con credenciales válidas', () => {
    cy.registerDocente().then(({ email, password }) => {
      cy.visit('/login');
      cy.get('[data-testid=login-email]').type(email);
      cy.get('[data-testid=login-password]').type(password);
      cy.get('[data-testid=login-submit]').click();

      cy.contains('Catálogo de libros').should('be.visible');
    });
  });

  it('muestra error con credenciales inválidas', () => {
    cy.visit('/login');
    cy.get('[data-testid=login-email]').type('inexistente@e2e.test');
    cy.get('[data-testid=login-password]').type('claveIncorrecta');
    cy.get('[data-testid=login-submit]').click();

    cy.get('[data-testid=login-error]').should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });

  it('cierra sesión desde el menú de usuario', () => {
    cy.registerDocente().then(({ email, password }) => {
      cy.loginAs(email, password);
      cy.visit('/');
      cy.contains('Catálogo de libros').should('be.visible');

      cy.get('[data-testid=nav-user-menu]').click();
      cy.get('[data-testid=nav-logout]').click();

      cy.location('pathname').should('eq', '/login');
    });
  });
});
