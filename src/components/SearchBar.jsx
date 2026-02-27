import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSearchMovies } from "../hooks/useSearchMovies.js";

const MOBILE_WIDTH = 640;
const FALLBACK_POSTER =
  "https://placehold.co/120x180/0f172a/94a3b8?text=No+Image";

const SearchBar = ({
  placeholder = "Tìm phim...",
  autoFocus = false,
  className = "",
}) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width: ${MOBILE_WIDTH}px)`).matches
      : false
  );
  const containerRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_WIDTH}px)`);
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const { data = [], isFetching } = useSearchMovies(debouncedQuery);
  const hasQuery = Boolean(debouncedQuery);
  const limit = isMobile ? 3 : 8;
  const results = data.slice(0, limit);
  const shouldShowDropdown = open && hasQuery;

  const onSubmit = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setOpen(false);
  };

  const handleSelect = (slug) => {
    if (!slug) return;
    navigate(`/movie/${slug}`);
    setOpen(false);
  };

  const viewAll = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form onSubmit={onSubmit} className="relative w-full" role="search">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full h-12 rounded-2xl bg-white/10 pl-12 pr-4 text-sm sm:text-base text-white placeholder:text-slate-200/70 border border-white/10 shadow-glass outline-none focus:border-white/40 focus:ring-2 focus:ring-white/30 backdrop-blur"
        />
      </form>

      {shouldShowDropdown && (
        <div className="absolute left-0 right-0 mt-2 z-30 rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur shadow-xl">
          <div className="p-3 flex items-center gap-2 text-sm text-slate-200">
            {isFetching ? (
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            )}
            <span className="text-xs uppercase tracking-[0.12em] text-slate-400">
              {isFetching ? "Đang tìm..." : "Gợi ý nhanh"}
            </span>
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y divide-white/5">
            {results.length === 0 && !isFetching ? (
              <div className="px-4 py-3 text-sm text-slate-400">No results found</div>
            ) : (
              results.map((movie) => (
                <button
                  key={movie.slug}
                  type="button"
                  onClick={() => handleSelect(movie.slug)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-700/70 transition-colors"
                >
                  <img
                    src={movie.poster_url || FALLBACK_POSTER}
                    alt={movie.name}
                    className="w-12 h-16 rounded-md object-cover flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white line-clamp-1">
                      {movie.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {movie.year || "Đang cập nhật"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {hasQuery && (
            <button
              type="button"
              onClick={viewAll}
              className="w-full px-4 py-3 text-center text-sm font-semibold text-emerald-300 hover:text-emerald-200 bg-slate-800/60 rounded-b-2xl"
            >
              View all results
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
