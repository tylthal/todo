import React, { createContext, useEffect, useState, ReactNode } from 'react';
// Use the modular Amplify packages to avoid bundling issues when Vite resolves
// dependencies. Importing from the root 'aws-amplify' package can fail if the
// dependency isn't installed yet.
import { Amplify } from '@aws-amplify/core';
import { Auth } from '@aws-amplify/auth';
import { appService } from './services/AppService';
import type { User } from '@sticky-notes/shared';

// Simple context used by the demo application to represent an authenticated
// user. In a real application this would be wired up to AWS Cognito or another
// auth provider. Here we just expose `login` and `logout` helpers and keep the
// user object in local React state.


/**
 * Shape of the context value returned by {@link UserContext}.
 * - `user` is `null` when unauthenticated.
 * - `login`/`logout` mutate the user state.
 */
interface UserContextType {
  user: User | null;
  login: () => void;
  logout: () => void;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  login: () => {},
  logout: () => {}
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Configure Amplify once on mount using environment variables.
  useEffect(() => {
    const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
    const domain = import.meta.env.VITE_COGNITO_DOMAIN;
    const redirect = import.meta.env.VITE_COGNITO_REDIRECT_URI;
    const logoutUri = import.meta.env.VITE_COGNITO_LOGOUT_URI || redirect;

    if (!userPoolId || !clientId || !domain || !redirect) {
      console.debug('Missing Cognito env vars', {
        userPoolId,
        clientId,
        domain,
        redirect,
      });
      return;
    }

    const region = userPoolId.split('_')[0];

    console.debug('Configuring Amplify Auth', {
      region,
      userPoolId,
      clientId,
      domain,
      redirect,
      logoutUri,
    });
    Amplify.configure({
      Auth: {
        region,
        userPoolId,
        userPoolWebClientId: clientId,
        oauth: {
          domain,
          scope: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
          redirectSignIn: redirect,
          redirectSignOut: logoutUri,
          responseType: 'code',
        },
      },
    });

    const loadUser = async () => {
      console.debug('Loading authenticated user...');
      try {
        const cognitoUser = await Auth.currentAuthenticatedUser();
        const attrsList = await Auth.userAttributes(cognitoUser);
        const attrs = Object.fromEntries(
          attrsList.map((a: any) => [a.Name, a.Value])
        ) as Record<string, string>;
        const u: User = {
          id: attrs.sub,
          name: attrs.name || attrs.email || 'User',
          email: attrs.email,
        };
        // Temporary debug output so we can inspect the authenticated user in
        // the browser console. This should be removed once authentication is
        // fully verified.
        console.debug('Authenticated user', u);
        setUser(u);
        appService.setUser(u);
      } catch (err) {
        console.debug('currentAuthenticatedUser failed', err);
        // not signed in
        setUser(null);
        appService.setUser(null);
      }
    };
    void loadUser();
  }, []);

  const login = () => {
    console.debug('Login requested');
    Auth.federatedSignIn();
  };

  const logout = async () => {
    console.debug('Logout requested');
    await Auth.signOut();
    setUser(null);
    appService.setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};
