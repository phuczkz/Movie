import { createContext, useContext, useState } from "react";

const AppModeContext = createContext({
  appMode: null, // "movie" | "comic" | null
  setAppMode: () => { },
});

export const AppModeProvider = ({ children }) => {
  const [appMode, setAppModeState] = useState(null);

  const setAppMode = (mode) => {
    setAppModeState(mode);
  };

  return (
    <AppModeContext.Provider value={{ appMode, setAppMode }}>
      {children}
    </AppModeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppMode = () => useContext(AppModeContext);
