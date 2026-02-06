const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-slate-950/80 backdrop-blur-xl text-sm text-slate-400">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span>
          © {new Date().getFullYear()} MovieSpace. Tìm, xem và lưu phim yêu
          thích.
        </span>
        <div className="flex items-center gap-4">
          <a
            className="hover:text-slate-200"
            href="https://tailwindcss.com"
            target="_blank"
            rel="noreferrer"
          >
            Tailwind
          </a>
          <a
            className="hover:text-slate-200"
            href="https://vitejs.dev"
            target="_blank"
            rel="noreferrer"
          >
            Vite
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
