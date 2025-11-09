import { ReactNode } from 'react';

interface AppLayoutFixedProps {
  children: ReactNode;
  darkMode?: boolean;
  toggleDarkMode?: () => void;
}

declare const AppLayoutFixed: React.FC<AppLayoutFixedProps>;

export default AppLayoutFixed;
