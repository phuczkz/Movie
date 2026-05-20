import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./PageTransition.jsx";
import { useStandalone } from "../hooks/useStandalone";

const Layout = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const { pathname, search } = location;
    void pathname; void search;
    window.scrollTo(0, 0);
  }, [location]);

  const isStandalone = useStandalone();

  return (
    <div className="bg-background text-slate-100 min-h-screen overflow-x-hidden">
      <div
        className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.08),transparent_25%)]"
        aria-hidden="true"
      />
      <Header />
      <main
        className={`relative z-10 mx-auto w-full max-w-[1680px] px-4 md:px-4 lg:px-6 ${isHome ? "pt-0 md:pt-0 lg:pt-24" : "pt-20 md:pt-24"
          } ${isStandalone ? "pb-28" : "pb-16"}`}
      >
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            {children}
          </PageTransition>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
