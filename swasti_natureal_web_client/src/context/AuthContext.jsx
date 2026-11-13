import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getCurrentUser, login as loginRequest, onUnauthorized, SESSION_KEY } from '../api.js';
import { setCurrency } from '../lib/format.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, permissions: [], error: '' });
  const [settings, setSettings] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setState({ status: 'signed-out', user: null, permissions: [], error: '' });
  }, []);

  useEffect(() => onUnauthorized(signOut), [signOut]);

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      setState({ status: 'signed-out', user: null, permissions: [], error: '' });
      return undefined;
    }
    let active = true;
    setState((current) => ({ ...current, status: 'loading', error: '' }));
    getCurrentUser()
      .then(({ user, permissions }) => active && setState({ status: 'signed-in', user, permissions, error: '' }))
      .catch((error) => {
        if (!active) return;
        // Only an invalid/expired token (401) signs the user out; other errors can be retried.
        if (error.status === 401) signOut();
        else setState({ status: 'error', user: null, permissions: [], error: error.message });
      });
    return () => { active = false; };
  }, [attempt, signOut]);

  const refreshSettings = useCallback(async () => {
    const data = await api.get('/settings');
    setCurrency(data.store?.currency, data.store?.currencySymbol);
    setSettings(data);
    return data;
  }, []);

  useEffect(() => {
    if (state.status === 'signed-in' && state.permissions.includes('dashboard.view')) refreshSettings().catch(() => {});
  }, [state.status, state.permissions, refreshSettings]);

  const value = useMemo(() => ({
    ...state,
    settings,
    refreshSettings,
    retry: () => setAttempt((count) => count + 1),
    can: (permission) => state.permissions.includes(permission),
    async signIn(credentials) {
      const { accessToken, user } = await loginRequest(credentials);
      sessionStorage.setItem(SESSION_KEY, accessToken);
      const me = await getCurrentUser();
      setState({ status: 'signed-in', user: me.user ?? user, permissions: me.permissions ?? [], error: '' });
    },
    signOut,
    setUser: (user) => setState((current) => ({ ...current, user })),
  }), [state, settings, refreshSettings, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
