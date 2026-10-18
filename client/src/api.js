export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const options = {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`/api${path}`, options);
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/me') {
      window.dispatchEvent(new Event('ds:unauthorized'));
    }
    throw new ApiError(data?.error || `Request failed (${response.status}).`, response.status, data);
  }
  return data;
}

export const api = {
  brand: () => request('/brand'),
  me: () => request('/auth/me'),
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/auth/logout', { method: 'POST', body: {} }),
  changePassword: (current_password, new_password) =>
    request('/auth/password', { method: 'POST', body: { current_password, new_password } }),

  stats: () => request('/stats'),
  listMembers: (params = {}) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') search.set(key, value);
    }
    return request(`/members?${search.toString()}`);
  },
  getMember: (id) => request(`/members/${id}`),
  createMember: (payload) => request('/members', { method: 'POST', body: payload }),
  updateMember: (id, payload) => request(`/members/${id}`, { method: 'PATCH', body: payload }),
  deleteMember: (id) => request(`/members/${id}`, { method: 'DELETE' }),
  recordPayment: (id, payload) => request(`/members/${id}/payment`, { method: 'POST', body: payload }),
  payOnline: (id) => request(`/members/${id}/pay-online`, { method: 'POST', body: {} }),

  listUsers: () => request('/users'),
  createUser: (payload) => request('/users', { method: 'POST', body: payload }),
  updateUser: (id, payload) => request(`/users/${id}`, { method: 'PATCH', body: payload }),

  getSettings: () => request('/settings'),
  updateSettings: (payload) => request('/settings', { method: 'PATCH', body: payload }),
};
