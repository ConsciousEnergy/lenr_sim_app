import { createContext, useContext, useState } from 'react';
const ThrottleContext = createContext();

export const useThrottle = () => useContext(ThrottleContext);

export const ThrottleProvider = ({ children }) => {
  const [isThrottled, setIsThrottled] = useState(false);
  const [throttleLevel, setThrottleLevel] = useState(0);

  return (
    <ThrottleContext.Provider value={{ isThrottled, setIsThrottled, throttleLevel, setThrottleLevel }}>
      {children}
    </ThrottleContext.Provider>
  );
}; 