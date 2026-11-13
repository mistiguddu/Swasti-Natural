'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCustomerToken, setCustomerToken, setUnauthorizedHandler, storeApi } from '../api.js';

const CustomerAuthContext = createContext(null);

/**
 * Customer session (separate from the admin session). Staff accounts can't use the
 * customer area — they are asked to use the admin console.
 */
export function CustomerAuthProvider({ children }) {
  const [state, setState] = useState({ status: getCustomerToken() ? 'loading' : 'signed-out', user: null });

  const signOut = useCallback(() => {
    setCustomerToken(null);
    setState({ status: 'signed-out', user: null });
  }, []);

  useEffect(() => setUnauthorizedHandler(signOut), [signOut]);

  useEffect(() => {
    if (!getCustomerToken()) return;
    storeApi.get('/auth/me')
      .then(({ user }) => {
        if (user.role !== 'user') signOut();
        else setState({ status: 'signed-in', user });
      })
      .catch((error) => (error.status === 401 ? signOut() : setState({ status: 'signed-out', user: null })));
  }, [signOut]);

  const accept = useCallback(({ accessToken, user }) => {
    if (user.role !== 'user') {
      const error = new Error('This is a staff account. Please sign in through the admin console at /admin.');
      error.status = 403;
      throw error;
    }
    setCustomerToken(accessToken);
    setState({ status: 'signed-in', user });
    return user;
  }, []);

  const value = useMemo(() => ({
    ...state,
    isSignedIn: state.status === 'signed-in',
    signIn: async (credentials) => accept(await storeApi.post('/auth/login', credentials)),
    register: async (data) => accept(await storeApi.post('/auth/register', data)),
    signOut,
    refresh: async () => {
      const { user } = await storeApi.get('/auth/me');
      setState({ status: 'signed-in', user });
      return user;
    },
    setUser: (user) => setState((current) => ({ ...current, user })),
  }), [state, accept, signOut]);

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomer() {
  return useContext(CustomerAuthContext);
}
