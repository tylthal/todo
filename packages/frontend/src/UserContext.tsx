import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { Amplify, Auth } from 'aws-amplify';
import { appService } from './services/AppService';

// Simple context used by the demo application to represent an authenticated
// user. In a real application this would be wired up to AWS Cognito or another
// auth provider. Here we just expose `login` and `logout` helpers and keep the
// user object in local React state.

export interface User {
  id: string;
  name: string;
  email?: string;
}

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

    if (!userPoolId || !clientId || !domain || !redirect) return;

    const region = userPoolId.split('_')[0];

    Amplify.configure({
      Auth: {
        region,
        userPoolId,
        userPoolWebClientId: clientId,
        oauth: {
          domain,
          scope: ['openid', 'email', 'profile'],
          redirectSignIn: redirect,
          redirectSignOut: redirect,
          responseType: 'code',
        },
      },
    });

    const loadUser = async () => {
      try {
        const cognitoUser = await Auth.currentAuthenticatedUser();
        const attrs = (cognitoUser as any).attributes || {};
        const u: User = {
          id: attrs.sub,
          name: attrs.name || attrs.email || 'User',
          email: attrs.email,
        };
        setUser(u);
        appService.setUser(u);
      } catch {
        // not signed in
        setUser(null);
        appService.setUser(null);
      }
    };
    void loadUser();
  }, []);

  const login = () => {
    Auth.federatedSignIn();
  };

  const logout = async () => {
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
