import { api } from '../api.js';
import { esc, icon } from '../ui.js';

function sealFor(name) {
  const words = String(name || 'Debating Society')
    .split(/\s+/)
    .filter((word) => !['the', 'of', 'and', '&'].includes(word.toLowerCase()));
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'DS';
}

export function loginView(container, { brand, notice, onSuccess }) {
  const society = brand?.society_name || 'The Debating Society';
  const tagline = brand?.tagline || 'Argue well. Think better.';

  container.innerHTML = `
    <div class="login-page">
      <section class="login-hero">
        <div class="hero-brand">
          <span class="seal">${esc(sealFor(society))}</span>
          <span>${esc(society)}</span>
        </div>

        <div class="hero-copy">
          <p class="eyebrow">Membership desk</p>
          <h1>Where every<br /><em>argument</em> begins.</h1>
          <p class="hero-text">
            Register general and executive members, collect dues online or at the desk,
            and keep the whole roster in one careful place.
          </p>
        </div>

        <div>
          <div class="hero-stats">
            <div><strong>Two tiers</strong><span>General &amp; executive</span></div>
            <div><strong>Two ways</strong><span>Online &amp; offline</span></div>
            <div><strong>One desk</strong><span>Admin &amp; desk access</span></div>
          </div>
          <p class="hero-quote" style="margin-top:22px">${esc(tagline)}</p>
        </div>
      </section>

      <main class="login-panel">
        <form class="login-card" id="login-form" novalidate>
          <div class="login-card-head">
            <p class="eyebrow">Sign in</p>
            <h2>Welcome back</h2>
            <p class="muted">Use your admin or desk account to continue.</p>
          </div>

          <p class="form-error" id="login-error" role="alert">${notice ? esc(notice) : ''}</p>

          <div class="field" data-field="username">
            <label for="login-username">Username or email</label>
            <input
              id="login-username"
              name="username"
              type="text"
              autocomplete="username"
              spellcheck="false"
              autocapitalize="none"
              required
              autofocus
            />
          </div>

          <div class="field" data-field="password">
            <label for="login-password">Password</label>
            <div class="input-wrap">
              <input
                id="login-password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
              />
              <button type="button" class="reveal" id="toggle-password" aria-label="Show password">Show</button>
            </div>
          </div>

          <button class="btn btn-primary btn-lg btn-block" type="submit" id="login-submit">
            Sign in ${icon('arrowRight')}
          </button>

          <details class="demo-note">
            <summary>First-time setup</summary>
            <p>
              Ask your society administrator for your login details. Administrators can use their
              invited email account; desk members can use accounts created by an administrator.
            </p>
          </details>
        </form>
      </main>
    </div>`;

  const form = container.querySelector('#login-form');
  const errorEl = container.querySelector('#login-error');
  const submit = container.querySelector('#login-submit');
  const usernameInput = form.elements.username;
  const passwordInput = form.elements.password;
  const toggle = container.querySelector('#toggle-password');

  toggle.addEventListener('click', () => {
    const showing = passwordInput.type === 'text';
    passwordInput.type = showing ? 'password' : 'text';
    toggle.textContent = showing ? 'Show' : 'Hide';
    toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    passwordInput.focus();
  });

  function showError(message) {
    errorEl.textContent = message;
    form.classList.remove('shake');
    void form.offsetWidth;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showError('Enter both your username and password.');
      (username ? passwordInput : usernameInput).focus();
      return;
    }

    errorEl.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Signing in…';

    try {
      const { user } = await api.login(username, password);
      await onSuccess(user);
    } catch (error) {
      showError(error.message || 'Unable to sign in.');
      submit.disabled = false;
      submit.innerHTML = `Sign in ${icon('arrowRight')}`;
      passwordInput.select();
    }
  });

  setTimeout(() => usernameInput.focus(), 30);
}
