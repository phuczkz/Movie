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

  return (
    <div className="flex items-center gap-2 text-sm text-slate-200" ref={containerRef}>
      {label && <span className="text-slate-400">{label}</span>}
      <div className="relative min-w-[140px]">
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (isOpen) setSearchQuery("");
          }}
          className="w-full flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-100 shadow-glass hover:bg-slate-800/70 focus:border-emerald-400 focus:outline-none transition-all duration-200 text-left"
        >
          <span className="truncate max-w-[120px]">{selectedOption.label}</span>
          <ChevronDown
            className={`size-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-white/10 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl">
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
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-emerald-500/20 hover:text-emerald-400 ${
                      opt.value === value
                        ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                        : "text-slate-300"
                    }`}
                  >
                    {opt.label}
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
