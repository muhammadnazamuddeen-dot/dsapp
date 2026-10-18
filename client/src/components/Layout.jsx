import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initials, societySeal } from '../lib/format';
import { Icon } from './Icon';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/register': 'New registration',
  '/members': 'Members',
  '/users': 'Desk accounts',
  '/settings': 'Settings',
};

function navClass({ isActive }) {
  return `nav-link ${isActive ? 'is-active' : ''}`.trim();
}

export function Layout() {
  const { user, brand, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const isAdmin = user?.role === 'admin';
  const title = PAGE_TITLES[location.pathname] || 'Dashboard';

  useEffect(() => {
    setNavOpen(false);
    document.title = `${title} · ${brand.society_name}`;
  }, [location.pathname, title, brand.society_name]);

  async function handleLogout() {
    await logout();
    navigate('/dashboard', { replace: true });
  }

  return (
    <div className="app-root is-authed">
      <div className={`shell ${navOpen ? 'nav-open' : ''}`.trim()}>
        <div className="sidebar-scrim" onClick={() => setNavOpen(false)} />
        <aside className="sidebar" aria-label="Main navigation">
          <div className="brand">
            <span className="seal">{societySeal(brand.society_name)}</span>
            <div>
              <div className="brand-name">{brand.society_name}</div>
              <div className="brand-sub">Membership desk</div>
            </div>
          </div>

          <nav className="nav">
            <NavLink className={navClass} to="/dashboard">
              <Icon name="dashboard" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink className={navClass} to="/register">
              <Icon name="userPlus" />
              <span>New registration</span>
            </NavLink>
            <NavLink className={navClass} to="/members">
              <Icon name="users" />
              <span>Members</span>
            </NavLink>
            {isAdmin && (
              <>
                <div className="nav-label">Administration</div>
                <NavLink className={navClass} to="/users">
                  <Icon name="shield" />
                  <span>Desk accounts</span>
                </NavLink>
              </>
            )}
            <NavLink className={navClass} to="/settings">
              <Icon name="settings" />
              <span>Settings</span>
            </NavLink>
          </nav>

          <div className="sidebar-foot">
            <div className="user-chip">
              <span className="avatar">{initials(user.full_name)}</span>
              <div>
                <div className="user-chip-name">{user.full_name}</div>
                <div className="user-chip-role">{isAdmin ? 'Administrator' : 'Desk member'}</div>
              </div>
            </div>
            <button className="signout" type="button" onClick={handleLogout}>
              <Icon name="logout" />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <button
              className="icon-btn nav-toggle"
              type="button"
              onClick={() => setNavOpen((open) => !open)}
              aria-label="Open navigation"
            >
              <Icon name="menu" />
            </button>
            <div className="topbar-title">{title}</div>
            <div className="topbar-actions">
              <span className="topbar-user">
                Signed in as <strong>{user.username}</strong>
              </span>
              <Link className="btn btn-primary btn-sm" to="/register">
                <Icon name="plus" />
                New member
              </Link>
            </div>
          </header>
          <main className="view view-enter" key={location.pathname}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
