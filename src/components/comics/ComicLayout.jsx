import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "../Header.jsx";

const ComicLayout = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === "/comics" || location.pathname === "/comics/";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen overflow-x-hidden font-sans">
      <div
        className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.05),transparent_35%)]"
        aria-hidden="true"
      />
      <Header />
      <main
        className={`relative z-10 mx-auto w-full max-w-[1440px] px-4 pb-16 md:px-6 lg:px-8 ${
          isHome ? "pt-20 lg:pt-24" : "pt-20 md:pt-24"
        }`}
      >
        {children}
      </main>
    </div>
  );
};

export default ComicLayout;
