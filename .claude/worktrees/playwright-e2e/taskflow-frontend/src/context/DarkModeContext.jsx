import { createContext, useContext } from 'react';
import useDarkMode from '../hooks/useDarkMode';

const DarkModeContext = createContext(null);

export function DarkModeProvider({ children }) {
  const value = useDarkMode();
  return <DarkModeContext.Provider value={value}>{children}</DarkModeContext.Provider>;
}

export function useDarkModeContext() {
  const ctx = useContext(DarkModeContext);
  if (!ctx) throw new Error('useDarkModeContext must be used inside DarkModeProvider');
  return ctx;
}
