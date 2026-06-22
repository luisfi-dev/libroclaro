/// <reference types="cypress" />

// Clave bajo la que el front guarda el JWT (web/src/api/client.ts).
const TOKEN_KEY = 'libroclaro.token';
const API = Cypress.env('apiUrl') as string;

function apiPath(path: string): string {
  return `${API}${path.startsWith('/') ? path : `/${path}`}`;
}

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'DOCENTE' | 'ADMIN_INSTITUCION' | 'EDITOR';
  plan: 'GRATUITO' | 'PRO' | 'INSTITUCIONAL';
  institutionId: string | null;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export interface DocenteResult extends AuthResult {
  email: string;
  password: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Autentica vía API (POST /auth/login) y devuelve { token, user }. */
      apiLogin(email: string, password: string): Chainable<AuthResult>;
      /** Inicia sesión por sesión cacheada, dejando el JWT en localStorage. */
      loginAs(email: string, password: string): Chainable<void>;
      /** Registra un DOCENTE nuevo con email único (estado limpio por prueba). */
      registerDocente(
        overrides?: Partial<{ fullName: string; email: string; birthDate: string; password: string }>,
      ): Chainable<DocenteResult>;
      /** Crea (y opcionalmente publica) un libro subiendo el PDF de fixture. */
      seedBook(
        token: string,
        overrides?: Partial<{
          title: string;
          schoolYear: string;
          subjectName: string;
          gradeName: string;
          publish: boolean;
        }>,
      ): Chainable<{ id: string; title: string }>;
      /** Crea una anotación en un libro vía API (rol EDITOR). */
      createAnnotation(
        token: string,
        bookId: string,
        overrides?: Partial<{ page: number; kind: 'ERROR' | 'ERROR_PARCIAL'; content: string }>,
      ): Chainable<{ id: string }>;
      /** Revela una anotación (descuenta cuota Free). Devuelve la respuesta. */
      revealAnnotation(token: string, annotationId: string): Chainable<Cypress.Response<unknown>>;
      /** Cambia de plan vía API (checkout simulado). */
      subscribe(token: string, payload: Record<string, unknown>): Chainable<AuthResult & Record<string, unknown>>;
    }
  }
}

Cypress.Commands.add('apiLogin', (email: string, password: string) => {
  return cy
    .request('POST', apiPath('/api/auth/login'), { email, password })
    .then((res) => {
      expect(res.status, 'login status').to.eq(200);
      return res.body as AuthResult;
    });
});

Cypress.Commands.add('loginAs', (email: string, password: string) => {
  cy.session(
    ['libroclaro', email],
    () => {
      cy.apiLogin(email, password).then(({ token }) => {
        // Visitamos una ruta del origen del front para que el localStorage que
        // escribimos quede asociado a baseUrl y Cypress lo cachee en la sesión.
        cy.visit('/login');
        cy.window().then((win) => win.localStorage.setItem(TOKEN_KEY, token));
      });
    },
    {
      validate() {
        cy.window().then((win) => {
          expect(win.localStorage.getItem(TOKEN_KEY)).to.be.a('string');
        });
      },
    },
  );
});

Cypress.Commands.add('registerDocente', (overrides = {}) => {
  const unique = `${Date.now()}.${Math.floor(Math.random() * 1e4)}`;
  const email = overrides.email ?? `docente.${unique}@e2e.test`;
  const password = overrides.password ?? 'docente1234';
  const body = {
    fullName: overrides.fullName ?? 'Docente E2E',
    email,
    birthDate: overrides.birthDate ?? '1990-05-15',
    password,
    passwordConfirmation: password,
  };
  return cy.request('POST', apiPath('/api/auth/register'), body).then((res) => {
    expect(res.status, 'register status').to.eq(201);
    const { token, user } = res.body as AuthResult;
    return { token, user, email, password };
  });
});

Cypress.Commands.add('seedBook', (token: string, overrides = {}) => {
  const subjectName = overrides.subjectName ?? 'Matemáticas';
  const gradeName = overrides.gradeName ?? '1° Primaria';

  return cy
    .request({ url: apiPath('/api/catalog/subjects'), headers: authHeader(token) })
    .then((sres) => {
      const subjects = (sres.body as { subjects: Array<{ id: string; name: string }> }).subjects;
      const subject = subjects.find((s) => s.name === subjectName) ?? subjects[0];
      return cy
        .request({ url: apiPath('/api/catalog/grade-levels'), headers: authHeader(token) })
        .then((gres) => {
          const grades = (gres.body as { gradeLevels: Array<{ id: string; name: string }> }).gradeLevels;
          const grade = grades.find((g) => g.name === gradeName) ?? grades[0];
          return cy.task<{ id: string; title: string }>('seedBook', {
            apiUrl: API,
            token,
            subjectId: subject.id,
            gradeId: grade.id,
            title: overrides.title ?? `Libro E2E ${Date.now()}`,
            schoolYear: overrides.schoolYear ?? '2025-2026',
            publish: overrides.publish ?? false,
          });
        });
    });
});

Cypress.Commands.add('createAnnotation', (token: string, bookId: string, overrides = {}) => {
  const body = {
    page: overrides.page ?? 1,
    kind: overrides.kind ?? 'ERROR',
    x: 0.1,
    y: 0.1,
    width: 0.3,
    height: 0.1,
    content: overrides.content ?? '**Corrección** de prueba con [fuente](https://example.com).',
  };
  return cy
    .request({ method: 'POST', url: apiPath(`/api/books/${bookId}/annotations`), headers: authHeader(token), body })
    .then((res) => {
      expect(res.status, 'create annotation').to.be.oneOf([200, 201]);
      return (res.body as { annotation: { id: string } }).annotation;
    });
});

Cypress.Commands.add('revealAnnotation', (token: string, annotationId: string) => {
  return cy.request({
    method: 'GET',
    url: apiPath(`/api/annotations/${annotationId}/reveal`),
    headers: authHeader(token),
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('subscribe', (token: string, payload: Record<string, unknown>) => {
  return cy
    .request({ method: 'POST', url: apiPath('/api/subscriptions/subscribe'), headers: authHeader(token), body: payload })
    .then((res) => {
      expect(res.status, 'subscribe status').to.eq(200);
      return res.body as AuthResult & Record<string, unknown>;
    });
});

export {};
