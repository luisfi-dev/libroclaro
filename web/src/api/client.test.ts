import { AxiosError } from 'axios';
import { apiUrl, getToken, setToken, clearToken, getErrorMessage } from './client';

describe('manejo de token en localStorage', () => {
  afterEach(() => localStorage.clear());

  it('setToken / getToken / clearToken', () => {
    expect(getToken()).toBeNull();
    setToken('abc123');
    expect(getToken()).toBe('abc123');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('apiUrl', () => {
  it('antepone una sola barra a rutas relativas', () => {
    expect(apiUrl('/api/books')).toBe('/api/books');
    expect(apiUrl('api/books')).toBe('/api/books');
  });

  it('deja intactas las URLs absolutas', () => {
    expect(apiUrl('https://cdn.test/x.png')).toBe('https://cdn.test/x.png');
  });
});

describe('getErrorMessage', () => {
  it('extrae el campo error de una respuesta de Axios', () => {
    const err = new AxiosError('Request failed');
    err.response = { data: { error: 'Correo en uso' } } as AxiosError['response'];
    expect(getErrorMessage(err)).toBe('Correo en uso');
  });

  it('cae al mensaje de Axios cuando no hay campo error', () => {
    const err = new AxiosError('Network Error');
    expect(getErrorMessage(err)).toBe('Network Error');
  });

  it('usa el message de un Error genérico', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('devuelve un mensaje por defecto para valores desconocidos', () => {
    expect(getErrorMessage('algo raro')).toBe('Error desconocido');
  });
});
