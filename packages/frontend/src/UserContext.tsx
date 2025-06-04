import React, { createContext, useState, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
}

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

  const login = () => {
    // placeholder logic for authentication
    setUser({ id: '1', name: 'Demo User' });
  };

  const logout = () => setUser(null);

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};
