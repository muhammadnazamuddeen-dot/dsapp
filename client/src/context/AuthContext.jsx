import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api';

export const DEFAULT_SETTINGS = {
  society_name: 'The Debating Society',
  tagline: 'Argue well. Think better.',
  currency: '৳',
  general_fee: 500,
  executive_fee: 1500,
};

const AuthContext = createContext(null);

function brandFrom(settings) {
  return {
    society_name: settings?.society_name || DEFAULT_SETTINGS.society_name,
    tagline: settings?.tagline || DEFAULT_SETTINGS.tagline,
  };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading',
    user: null,
    settings: DEFAULT_SETTINGS,
    brand: brandFrom(DEFAULT_SETTINGS),
    error: '',
  });
  const [notice, setNotice] = useState('');
  const bootingRef = useRef(true);

  const boot = useCallback(async () => {
    bootingRef.current = true;
    setState((current) => ({ ...current, status: 'loading', error: '' }));

    try {
      const [me, settingsResponse] = await Promise.all([api.me(), api.getSettings()]);
      const settings = settingsResponse.settings || DEFAULT_SETTINGS;
      setState({
        status: 'authed',
        user: me.user,
        settings,
        brand: brandFrom(settings),
        error: '',
      });
      setNotice('');
    } catch (error) {
      if (error.status === 401) {
        let brand = brandFrom(DEFAULT_SETTINGS);
        try {
          const response = await api.brand();
          brand = { ...brand, ...response.brand };
        } catch {
          /* keep fallback branding */
        }
        setState({
          status: 'anon',
          user: null,
          settings: DEFAULT_SETTINGS,
          brand,
          error: '',
        });
      } else {
        setState((current) => ({
          ...current,
          status: 'error',
          error: error.message || 'The app could not start.',
        }));
      }
    } finally {
      bootingRef.current = false;
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    const onUnauthorized = () => {
      if (bootingRef.current) return;
      setNotice('Your session expired. Please sign in again.');
      setState((current) => ({
        ...current,
        status: 'anon',
        user: null,
        error: '',
      }));
    };
    window.addEventListener('ds:unauthorized', onUnauthorized);
    return () => window.removeEventListener('ds:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (username, password) => {
    const response = await api.login(username, password);
    let settings = DEFAULT_SETTINGS;
    try {
      const settingsResponse = await api.getSettings();
      settings = settingsResponse.settings || DEFAULT_SETTINGS;
    } catch {
      /* fall back to default branding if settings are temporarily unavailable */
    }
    setState({
      status: 'authed',
      user: response.user,
      settings,
      brand: brandFrom(settings),
      error: '',
    });
    setNotice('');
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* the cookie is cleared server-side when possible */
    }
    setNotice('');
    setState((current) => ({
      ...current,
      status: 'anon',
      user: null,
      error: '',
    }));
  }, []);

  const refreshSettings = useCallback(async () => {
    const response = await api.getSettings();
    const settings = response.settings || DEFAULT_SETTINGS;
    setState((current) => ({
      ...current,
      settings,
      brand: brandFrom(settings),
    }));
    return settings;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        notice,
        boot,
        login,
        logout,
        refreshSettings,
        clearNotice: () => setNotice(''),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
