import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Icon } from './components/Icon';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RegisterPage } from './pages/RegisterPage';
import { MembersPage } from './pages/MembersPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';

function LoadingScreen({ label = 'Opening the desk…' }) {
  return (
    <div className="app-root">
      <div className="page-loading">
        <span className="spinner" />
        {label}
      </div>
    </div>
  );
}

function BootError({ message, onRetry }) {
  return (
    <div className="app-root">
      <div className="boot-error">
        <div className="panel">
          <div className="empty-icon" style={{ margin: '0 auto 14px' }}>
            <Icon name="alert" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26 }}>
            Cannot reach the server
          </h1>
          <p className="muted" style={{ margin: '8px 0 18px' }}>
            {message || 'The app could not start.'}
          </p>
          <button className="btn btn-primary" type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

export function App() {
  const { status, error, boot } = useAuth();

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'error') return <BootError message={error} onRetry={boot} />;
  if (status === 'anon') return <LoginPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route
          path="/users"
          element={
            <AdminOnly>
              <UsersPage />
            </AdminOnly>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
