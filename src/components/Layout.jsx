import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import BackToTop from '@/components/BackToTop.jsx';
import { AnimatePresence } from "framer-motion";
import PageTransition from '@/components/PageTransition.jsx';
import PullToRefresh from '@/components/PullToRefresh.jsx';

const Layout = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isDetail = location.pathname.startsWith("/movie/");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  return (
    <div className="bg-background text-slate-100 min-h-screen flex flex-col overflow-x-hidden">
      {/* Pull-to-Refresh: chỉ hiển thị trên mobile/tablet */}
      <PullToRefresh />
      <div
        className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.08),transparent_25%)]"
        aria-hidden="true"
      />
      <Header />
      <main
        className={`relative z-10 mx-auto w-full max-w-[1680px] flex-1 flex flex-col px-4 sm:px-5 md:px-6 lg:px-6 xl:px-8 2xl:px-10 ${
          isHome || isDetail
            ? "pt-0 md:pt-0 lg:pt-24"
            : "pt-[calc(3.5rem+env(safe-area-inset-top,0px))] md:pt-24"
        } pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]`}
      >
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            {children}
          </PageTransition>
        </AnimatePresence>
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default Layout;
