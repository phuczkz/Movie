import { useState, useEffect } from "react";

export const useStandalone = () => {
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator).standalone 
      || (typeof document !== "undefined" && document.referrer.includes('android-app://'));
  });

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator).standalone 
        || document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);
    
    return () => {
      mediaQuery.removeEventListener('change', checkStandalone);
    };
  }, []);

  return isStandalone;
};
