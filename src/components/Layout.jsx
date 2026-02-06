import Header from "./Header.jsx";
import Footer from "./Footer.jsx";

const Layout = ({ children }) => {
  return (
    <div className="bg-background text-slate-100 min-h-screen">
      <div
        className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.08),transparent_25%)]"
        aria-hidden="true"
      />
      <Header />
      <main className="relative z-10 max-w-6xl mx-auto px-4 pb-16 pt-6 md:pt-10">
        {children}
      </main>
      {/* <Footer /> */}
    </div>
  );
};

export default Layout;
