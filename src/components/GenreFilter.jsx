import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useMovieGenres } from "@/features/movies/hooks/useKKphimMovies";
import { isForbiddenGenre } from "@/utils/filter";

const DEFAULT_GENRE_OPTIONS = [
  { label: "Tất cả thể loại", value: "" },
  { label: "Hành Động", value: "hanh-dong" },
  { label: "Tình Cảm", value: "tinh-cam" },
  { label: "Hài Hước", value: "hai-huoc" },
  { label: "Kinh Dị", value: "kinh-di" },
  { label: "Tâm Lý", value: "tam-ly" },
  { label: "Phiêu Lưu", value: "phieu-luu" },
  { label: "Hoạt Hình", value: "hoat-hinh" },
  { label: "Cổ Trang", value: "co-trang" },
  { label: "Khoa Học", value: "khoa-hoc" },
  { label: "Viễn Tưởng", value: "vien-tuong" },
];

const GenreFilter = ({ value, onChange, label = "Thể loại:" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);

  const { data: apiGenres = [] } = useMovieGenres();

  const options = useMemo(() => {
    if (apiGenres && apiGenres.length > 0) {
      const filtered = apiGenres.filter((g) => !isForbiddenGenre(g));
      return [
        { label: "Tất cả thể loại", value: "" },
        ...filtered.map((g) => ({
          label: g.name,
          value: g.slug,
        })),
      ];
    }
    return DEFAULT_GENRE_OPTIONS;
  }, [apiGenres]);

  const selectedOption =
    options.find((opt) => opt.value === value) || options[0];

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayMobileLabel = useMemo(() => {
    if (!value) return "Thể loại";
    return selectedOption.label;
  }, [value, selectedOption]);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-200 w-full sm:w-auto" ref={containerRef}>
      {label && <span className="hidden lg:inline text-slate-400 text-xs sm:text-sm whitespace-nowrap">{label}</span>}
      <div className="relative w-full sm:w-auto sm:min-w-[130px]">
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (isOpen) setSearchQuery("");
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={label || "Chọn thể loại"}
          className={`w-full flex items-center justify-between gap-1.5 rounded-xl border px-2.5 sm:px-3 py-2 text-xs sm:text-sm shadow-glass transition-all duration-200 text-left min-h-[38px] sm:min-h-[40px] active:scale-95 ${
            value
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-medium shadow-emerald-500/10"
              : "border-white/10 bg-slate-900/70 hover:bg-slate-800/70 text-slate-200 hover:border-white/20"
          }`}
        >
          <span className="truncate">
            <span className="sm:hidden">{displayMobileLabel}</span>
            <span className="hidden sm:inline">{selectedOption.label}</span>
          </span>
          <ChevronDown
            className={`size-3.5 sm:size-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div
            role="listbox"
            className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 top-full z-50 mt-1.5 w-48 sm:w-52 max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/10 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl animate-fadeIn"
          >
            {options.length > 8 && (
              <div className="relative mb-1.5 px-1 pt-1">
                <Search className="absolute left-3 top-3 size-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm thể loại..."
                  className="w-full rounded-lg bg-white/5 pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-400 border border-white/10 focus:border-emerald-400 focus:outline-none"
                  autoFocus
                />
              </div>
            )}
            <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={opt.value === value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`w-full rounded-lg px-2.5 sm:px-3 py-2 text-left text-xs transition-colors min-h-[34px] flex items-center hover:bg-emerald-500/20 hover:text-emerald-400 ${
                      opt.value === value
                        ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                        : "text-slate-300"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-slate-400 text-center">
                  Không tìm thấy
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenreFilter;
