import React, { createContext, ReactNode, useContext, useState } from 'react';

interface CloseHelpers<T> {
  resolve(value: T): void;
  reject(): void;
}

type Renderer<T> = (helpers: CloseHelpers<T>) => React.ReactNode;

interface DialogContextType {
  open<T>(renderer: Renderer<T>): Promise<T>;
}

const DialogContext = createContext<DialogContextType>({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  open: async (_renderer) => {
    throw new Error('DialogProvider missing');
  },
});

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [element, setElement] = useState<React.ReactNode | null>(null);

  const open = <T,>(renderer: Renderer<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const helpers: CloseHelpers<T> = {
        resolve: (value) => {
          setElement(null);
          resolve(value);
        },
        reject: () => {
          setElement(null);
          reject();
        },
      };
      setElement(renderer(helpers));
    });
  };

  return (
    <DialogContext.Provider value={{ open }}>
      {children}
      {element}
    </DialogContext.Provider>
  );
};

export const useDialog = () => useContext(DialogContext);
