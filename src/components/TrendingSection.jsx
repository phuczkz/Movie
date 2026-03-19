import TrendingCard from "./TrendingCard.jsx";
import Section from "./Section.jsx";

const TrendingSection = ({ movies = [], loading = false }) => {
  if (loading) {
    return (
      <Section title="Top 10 phim bộ hôm nay">
        <div className="flex gap-4 overflow-x-hidden pt-4 pb-8">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
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
        <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth pt-4 pb-8 snap-x snap-mandatory">
          {movies.slice(0, 10).map((movie, index) => (
            <div key={movie.slug} className="snap-start first:pl-2 last:pr-2">
              <TrendingCard movie={movie} index={index} />
            </div>
          ))}
        </div>
        
        {/* Optional: Add gradient fades on edges for mobile */}
        <div className="absolute top-0 right-0 bottom-8 w-16 bg-gradient-to-l from-[#0b0b15] to-transparent pointer-events-none opacity-0 group-hover/scroll:opacity-100 transition-opacity hidden sm:block" />
      </div>
    </Section>
  );
};

export default TrendingSection;
