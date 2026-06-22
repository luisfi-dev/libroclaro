import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';

// Mockeamos useAuth para controlar el estado de sesión sin montar el provider real
// (que arrastraría axios/import.meta innecesariamente).
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function renderAt(node: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/protegido']}>
      <Routes>
        <Route path="/login" element={<div>Pantalla de login</div>} />
        <Route path="/" element={<div>Inicio</div>} />
        <Route path="/protegido" element={node} />
      </Routes>
    </MemoryRouter>,
  );
}

function authValue(partial: Partial<ReturnType<typeof useAuth>>) {
  return { user: null, loading: false, login: jest.fn(), register: jest.fn(), logout: jest.fn(), refresh: jest.fn(), setUser: jest.fn(), ...partial } as ReturnType<typeof useAuth>;
}

const editor: User = {
  id: 'u1', fullName: 'E', email: 'e@x.com', birthDate: '1990-01-01',
  role: 'EDITOR', plan: 'PRO', institutionId: null, createdAt: '', updatedAt: '',
};

afterEach(() => jest.clearAllMocks());

describe('ProtectedRoute', () => {
  it('muestra un spinner mientras carga', () => {
    mockUseAuth.mockReturnValue(authValue({ loading: true }));
    renderAt(<ProtectedRoute><div>Privado</div></ProtectedRoute>);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('redirige a /login cuando no hay usuario', () => {
    mockUseAuth.mockReturnValue(authValue({ user: null }));
    renderAt(<ProtectedRoute><div>Privado</div></ProtectedRoute>);
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
  });

  it('redirige a / cuando el rol no está permitido', () => {
    mockUseAuth.mockReturnValue(authValue({ user: { ...editor, role: 'DOCENTE' } }));
    renderAt(
      <ProtectedRoute roles={['EDITOR']}>
        <div>Solo editores</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.queryByText('Solo editores')).not.toBeInTheDocument();
  });

  it('renderiza los children cuando el rol coincide', () => {
    mockUseAuth.mockReturnValue(authValue({ user: editor }));
    renderAt(
      <ProtectedRoute roles={['EDITOR']}>
        <div>Solo editores</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Solo editores')).toBeInTheDocument();
  });
});
