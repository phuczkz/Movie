import { createContext, use, useMemo, useState, useCallback } from "react";

const APP_MODE_STORAGE_KEY = "app-mode";

const AppModeContext = createContext({
  appMode: null, // "movie" | "comic" | null
  setAppMode: () => {},
});

export const AppModeProvider = ({ children }) => {
  const [appMode, setAppModeState] = useState(() => {
    try {
      const savedMode = localStorage.getItem(APP_MODE_STORAGE_KEY);
      return savedMode === "movie" || savedMode === "comic" ? savedMode : null;
    } catch {
      return null;
    }
  });

  const setAppMode = useCallback((mode) => {
    try {
      if (mode === "movie" || mode === "comic") {
        localStorage.setItem(APP_MODE_STORAGE_KEY, mode);
      } else {
        localStorage.removeItem(APP_MODE_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures (private mode, blocked storage, etc.)
    }
    setAppModeState(mode);
  }, []);

  const contextValue = useMemo(
    () => ({ appMode, setAppMode }),
    [appMode, setAppMode]
  );

  return (
    <AppModeContext.Provider value={contextValue}>
      {children}
    </AppModeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppMode = () => use(AppModeContext);
