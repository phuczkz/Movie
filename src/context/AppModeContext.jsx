import { createContext, use, useMemo } from "react";

const AppModeContext = createContext({
  appMode: "movie",
  setAppMode: () => {},
});

export const AppModeProvider = ({ children }) => {
  // Dọn dẹp key cũ nếu có trong localStorage
  try {
    localStorage.removeItem("app-mode");
  } catch {
    // Ignore storage errors
  }

  const contextValue = useMemo(
    () => ({
      appMode: "movie",
      setAppMode: () => {},
    }),
    []
  );

  return (
    <AppModeContext.Provider value={contextValue}>
      {children}
    </AppModeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppMode = () => use(AppModeContext);
