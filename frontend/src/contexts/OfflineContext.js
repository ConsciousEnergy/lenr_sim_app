import { createContext, useContext, useState } from 'react';
const OfflineContext = createContext();

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);

  return (
    <OfflineContext.Provider value={{ isOffline, setIsOffline }}>
      {children}
    </OfflineContext.Provider>
  );
}; 