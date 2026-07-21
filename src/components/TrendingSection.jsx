import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import TrendingCard from '@/features/movies/components/TrendingCard.jsx';
import Section from '@/components/Section.jsx';

const EMPTY_MOVIES = [];

const TrendingSection = ({ movies = EMPTY_MOVIES, loading = false }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [movies]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <Section title="Top 10 phim bộ hôm nay">
        <div className="flex gap-4 overflow-x-hidden pt-4 pb-8">
          {["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"].map((key) => (
            <div
              key={key}
              className="min-w-[180px] sm:min-w-[220px] aspect-[2/3] rounded-3xl bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      </Section>
    );
  }

  if (!movies || movies.length === 0) return null;

  return (
    <Section 
      title="Top 10 phim bộ hôm nay" 
      action={<span className="text-sm font-semibold text-amber-500 uppercase tracking-wider">Hot</span>}
    >
      <div className="relative group/scroll">
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth pt-4 pb-8 snap-x snap-mandatory"
        >
          {movies.slice(0, 10).map((movie, index) => (
            <div key={movie.slug} className="snap-start first:pl-2 last:pr-2">
              <TrendingCard movie={movie} index={index} />
            </div>
          ))}
        </div>
        
        {/* Nav arrows - desktop only */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="hidden lg:flex absolute left-2 top-[calc(50%-16px)] -translate-y-1/2 z-20 items-center justify-center w-10 h-10 rounded-full bg-black/60 border border-white/10 text-white backdrop-blur-sm opacity-0 group-hover/scroll:opacity-100 transition-opacity hover:bg-black/80"
            aria-label="Cuộn trái"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="hidden lg:flex absolute right-2 top-[calc(50%-16px)] -translate-y-1/2 z-20 items-center justify-center w-10 h-10 rounded-full bg-black/60 border border-white/10 text-white backdrop-blur-sm opacity-0 group-hover/scroll:opacity-100 transition-opacity hover:bg-black/80"
            aria-label="Cuộn phải"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Optional: Add gradient fades on edges for mobile */}
        <div className="absolute top-0 right-0 bottom-8 w-16 bg-gradient-to-l from-[#0b0b15] to-transparent pointer-events-none opacity-0 group-hover/scroll:opacity-100 transition-opacity hidden sm:block" />
      </div>
    </Section>
  );
};

export default TrendingSection;
