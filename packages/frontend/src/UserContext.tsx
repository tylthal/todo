import React, { createContext, useState, ReactNode } from 'react';

// Simple context used by the demo application to represent an authenticated
// user. In a real application this would be wired up to AWS Cognito or another
// auth provider. Here we just expose `login` and `logout` helpers and keep the
// user object in local React state.

export interface User {
  id: string;
  name: string;
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
  // Track the currently logged in user. `null` means no one is logged in.
  const [user, setUser] = useState<User | null>(null);

  const login = () => {
    // In lieu of real authentication logic we just set a fixed user object.
    // This keeps the demo self-contained.
    setUser({ id: '1', name: 'Demo User' });
  };

  // Clear the session
  const logout = () => setUser(null);

  // Provide the current user and auth helpers to descendants
  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};
