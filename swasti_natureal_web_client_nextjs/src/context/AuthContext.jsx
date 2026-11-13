'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getCurrentUser, login as loginRequest, onUnauthorized, SESSION_KEY, VIEW_AS_KEY } from '../api.js';
import { setCurrency } from '../lib/format.js';

const AuthContext = createContext(null);

const OUTDATED_API = 'The API server is running an older version. Restart it (stop it, then run "npm run dev" in swasti_natureal_api_server) and try again.';

/** Older API builds don't send `permissions`; never let that crash the app. */
function sessionFrom({ user, permissions, activeRole, switchableRoles }) {
  if (!Array.isArray(permissions)) return { status: 'error', user: null, permissions: [], error: OUTDATED_API };
  return {
    status: 'signed-in',
    user,
    permissions,
    activeRole: activeRole ?? user?.role,
    switchableRoles: Array.isArray(switchableRoles) ? switchableRoles : [],
    error: '',
  };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, permissions: [], error: '' });
  const [settings, setSettings] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(VIEW_AS_KEY);
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
      .then((me) => active && setState(sessionFrom(me)))
      .catch((error) => {
        if (!active) return;
        // Only an invalid/expired token (401) signs the user out; other errors can be retried.
        if (error.status === 401) signOut();
        // A stale "view as" role (e.g. the account was demoted) — drop it and load the real session.
        else if (error.status === 403 && sessionStorage.getItem(VIEW_AS_KEY)) {
          sessionStorage.removeItem(VIEW_AS_KEY);
          setAttempt((count) => count + 1);
        }
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
    can: (permission) => (state.permissions ?? []).includes(permission),
    /** True while a super admin is acting as a lower role. */
    isViewingAs: Boolean(state.user && state.activeRole && state.activeRole !== state.user.role),
    /** Switch the dashboard to `role` (one of `switchableRoles`), or back to the real role. */
    async switchRole(role) {
      const target = !role || role === state.user?.role ? null : role;
      const previous = sessionStorage.getItem(VIEW_AS_KEY);
      if (target) sessionStorage.setItem(VIEW_AS_KEY, target);
      else sessionStorage.removeItem(VIEW_AS_KEY);
      try {
        setState(sessionFrom(await getCurrentUser()));
      } catch (error) {
        if (previous) sessionStorage.setItem(VIEW_AS_KEY, previous);
        else sessionStorage.removeItem(VIEW_AS_KEY);
        throw error;
      }
    },
    async signIn(credentials) {
      const { accessToken, user } = await loginRequest(credentials);
      sessionStorage.setItem(SESSION_KEY, accessToken);
      sessionStorage.removeItem(VIEW_AS_KEY);
      const me = await getCurrentUser();
      setState(sessionFrom({ ...me, user: me.user ?? user }));
    },
    signOut,
    setUser: (user) => setState((current) => ({ ...current, user })),
  }), [state, settings, refreshSettings, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
