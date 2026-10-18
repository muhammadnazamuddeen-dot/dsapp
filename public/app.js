import { api, ApiError } from './api.js';
import { esc, icon, initials } from './ui.js';
import { loginView } from './views/login.js';
import { dashboardView } from './views/dashboard.js';
import { registerView } from './views/register.js';
import { membersView } from './views/members.js';
import { usersView } from './views/users.js';
import { settingsView } from './views/settings.js';

const VIEWS = {
  dashboard: { title: 'Dashboard', view: dashboardView },
  register: { title: 'New registration', view: registerView },
  members: { title: 'Members', view: membersView },
  users: { title: 'Desk accounts', view: usersView, adminOnly: true },
  settings: { title: 'Settings', view: settingsView },
};

const state = {
  user: null,
  settings: null,
  brand: { society_name: 'The Debating Society', tagline: 'Argue well. Think better.' },
};

const appEl = document.getElementById('app');

function applySettings(settings) {
  state.settings = settings;
  state.brand = { society_name: settings.society_name, tagline: settings.tagline };
}

function societySeal() {
  const words = String(state.brand.society_name || 'Debating Society')
    .split(/\s+/)
    .filter((word) => !['the', 'of', 'and', '&'].includes(word.toLowerCase()));
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'DS';
}

function currentRoute() {
  const key = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
  return VIEWS[key] ? key : 'dashboard';
}

function context() {
  return {
    user: state.user,
    settings: state.settings,
    brand: state.brand,
    navigate(hash) {
      if (location.hash === hash) showRoute();
      else location.hash = hash;
    },
    reload: showRoute,
    async refreshSettings() {
      const { settings } = await api.getSettings();
      applySettings(settings);
      updateBrand();
    },
    signOut: logout,
  };
}

function updateBrand() {
  document.querySelectorAll('[data-brand-name]').forEach((el) => {
    el.textContent = state.brand.society_name;
  });
  document.querySelectorAll('[data-brand-seal]').forEach((el) => {
    el.textContent = societySeal();
  });
}

function closeNav() {
  document.querySelector('.shell')?.classList.remove('nav-open');
}

async function showLogin(notice) {
  state.user = null;
  closeAllModals();
  appEl.className = 'app-root';
  try {
    const { brand } = await api.brand();
    state.brand = { ...state.brand, ...brand };
  } catch {
    /* keep last known brand */
  }

  loginView(appEl, {
    brand: state.brand,
    notice,
    async onSuccess(user) {
      state.user = user;
      try {
        const { settings } = await api.getSettings();
        applySettings(settings);
      } catch {
        /* settings load retried in shell */
      }
      renderShell();
      if (!location.hash || location.hash === '#/') history.replaceState(null, '', '#/dashboard');
      await showRoute();
    },
  });
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
  document.body.classList.remove('modal-open');
}

function renderShell() {
  const isAdmin = state.user.role === 'admin';
  appEl.className = 'app-root is-authed';
  appEl.innerHTML = `
    <div class="shell">
      <div class="sidebar-scrim" data-close-nav></div>
      <aside class="sidebar" aria-label="Main navigation">
        <div class="brand">
          <span class="seal" data-brand-seal>${esc(societySeal())}</span>
          <div>
            <div class="brand-name" data-brand-name>${esc(state.brand.society_name)}</div>
            <div class="brand-sub">Membership desk</div>
          </div>
        </div>
        <nav class="nav">
          <a class="nav-link" href="#/dashboard" data-nav="dashboard">${icon('dashboard')}<span>Dashboard</span></a>
          <a class="nav-link" href="#/register" data-nav="register">${icon('userPlus')}<span>New registration</span></a>
          <a class="nav-link" href="#/members" data-nav="members">${icon('users')}<span>Members</span></a>
          ${isAdmin ? `<div class="nav-label">Administration</div>
          <a class="nav-link" href="#/users" data-nav="users">${icon('shield')}<span>Desk accounts</span></a>` : ''}
          <a class="nav-link" href="#/settings" data-nav="settings">${icon('settings')}<span>Settings</span></a>
        </nav>
        <div class="sidebar-foot">
          <div class="user-chip">
            <span class="avatar">${esc(initials(state.user.full_name))}</span>
            <div>
              <div class="user-chip-name">${esc(state.user.full_name)}</div>
              <div class="user-chip-role">${esc(isAdmin ? 'Administrator' : 'Desk member')}</div>
            </div>
          </div>
          <button class="signout" type="button" data-action="logout">
            ${icon('logout')}<span>Sign out</span>
          </button>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button class="icon-btn nav-toggle" type="button" data-action="toggle-nav" aria-label="Open navigation">
            ${icon('menu')}
          </button>
          <div class="topbar-title" id="page-title">Dashboard</div>
          <div class="topbar-actions">
            <span class="topbar-user">Signed in as <strong>${esc(state.user.username)}</strong></span>
            <a class="btn btn-primary btn-sm" href="#/register">${icon('plus')}New member</a>
          </div>
        </header>
        <main class="view" id="view">
          <div class="page-loading"><span class="spinner"></span>Loading…</div>
        </main>
      </div>
    </div>`;

  appEl.querySelector('[data-action="logout"]').addEventListener('click', logout);
  appEl.querySelector('[data-action="toggle-nav"]').addEventListener('click', () => {
    appEl.querySelector('.shell').classList.toggle('nav-open');
  });
  appEl.querySelector('[data-close-nav]').addEventListener('click', closeNav);
}

async function logout() {
  try {
    await api.logout();
  } catch {
    /* cookie is cleared server-side when possible */
  }
  closeAllModals();
  history.replaceState(null, '', '#/dashboard');
  await showLogin();
}

async function showRoute() {
  if (!state.user) return;
  const key = currentRoute();
  const route = VIEWS[key];

  if (route.adminOnly && state.user.role !== 'admin') {
    location.hash = '#/dashboard';
    return;
  }

  closeNav();
  document.title = `${route.title} · ${state.brand.society_name}`;
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = route.title;
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.nav === key);
  });

  const view = document.getElementById('view');
  view.innerHTML = `<div class="page-loading"><span class="spinner"></span>Loading…</div>`;

  try {
    await route.view(view, context());
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await showLogin('Your session expired. Please sign in again.');
      return;
    }
    view.innerHTML = `
      <div class="panel error-panel">
        <div class="empty-icon">${icon('alert')}</div>
        <h2 style="font-family:var(--font-display);font-weight:400;font-size:22px;margin-bottom:6px">Something went wrong</h2>
        <p>${esc(error?.message || 'Unable to load this page.')}</p>
        <button class="btn btn-primary" type="button" data-retry>Try again</button>
      </div>`;
    view.querySelector('[data-retry]').addEventListener('click', showRoute);
  }

  view.classList.remove('view-enter');
  void view.offsetWidth;
  view.classList.add('view-enter');
}

async function boot() {
  appEl.innerHTML = `<div class="page-loading"><span class="spinner"></span>Opening the desk…</div>`;
  try {
    const [me, settings] = await Promise.all([api.me(), api.getSettings()]);
    state.user = me.user;
    applySettings(settings.settings);
    renderShell();
    await showRoute();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await showLogin();
      return;
    }
    appEl.className = 'app-root';
    appEl.innerHTML = `
      <div class="boot-error">
        <div class="panel">
          <div class="empty-icon" style="margin:0 auto 14px">${icon('alert')}</div>
          <h1 style="font-family:var(--font-display);font-weight:400;font-size:26px">Cannot reach the server</h1>
          <p class="muted" style="margin:8px 0 18px">${esc(error?.message || 'The app could not start.')}</p>
          <button class="btn btn-primary" type="button" data-retry>Retry</button>
        </div>
      </div>`;
    appEl.querySelector('[data-retry]').addEventListener('click', boot);
  }
}

window.addEventListener('hashchange', () => {
  if (state.user) showRoute();
});

boot();
