import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Cuộn lên đầu trang"
      title="Lên đầu trang"
      className={`fixed bottom-6 right-6 z-40 size-12 rounded-full bg-emerald-500/90 hover:bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-500/25 backdrop-blur-md border border-emerald-400/20 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${
        visible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <ChevronUp className="size-5 stroke-[2.5]" />
    </button>
  );
};

export default BackToTop;
