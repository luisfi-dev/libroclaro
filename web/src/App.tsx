import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import CatalogPage from './pages/CatalogPage';
import BookDetailPage from './pages/BookDetailPage';
import BookReaderPage from './pages/BookReaderPage';
import EditorDashboardPage from './pages/editor/EditorDashboardPage';
import EditorBookPage from './pages/editor/EditorBookPage';
import InstitutionPage from './pages/institution/InstitutionPage';
import SubscriptionsPage from './pages/subscriptions/SubscriptionsPage';
import InvoicesPage from './pages/subscriptions/InvoicesPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CatalogPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="books/:id" element={<BookDetailPage />} />
        <Route path="books/:id/read" element={<BookReaderPage />} />

        <Route
          path="editor"
          element={
            <ProtectedRoute roles={['EDITOR']}>
              <EditorDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="editor/books/:id"
          element={
            <ProtectedRoute roles={['EDITOR']}>
              <EditorBookPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="institution"
          element={
            <ProtectedRoute roles={['ADMIN_INSTITUCION']}>
              <InstitutionPage />
            </ProtectedRoute>
          }
        />

        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="subscriptions/invoices" element={<InvoicesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
