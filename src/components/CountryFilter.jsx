import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useMovieCountries } from "@/features/movies/hooks/useKKphimMovies";

const DEFAULT_COUNTRY_OPTIONS = [
  { label: "Tất cả quốc gia", value: "" },
  { label: "Việt Nam", value: "viet-nam" },
  { label: "Hàn Quốc", value: "han-quoc" },
  { label: "Nhật Bản", value: "nhat-ban" },
  { label: "Trung Quốc", value: "trung-quoc" },
  { label: "Mỹ", value: "my" },
  { label: "Anh", value: "anh" },
  { label: "Thái Lan", value: "thai-lan" },
  { label: "Âu Mỹ", value: "au-my" },
];

const CountryFilter = ({ value, onChange, label = "Quốc gia:" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);

  const { data: apiCountries = [] } = useMovieCountries();

  const options = useMemo(() => {
    if (apiCountries && apiCountries.length > 0) {
      return [
        { label: "Tất cả quốc gia", value: "" },
        ...apiCountries.map((c) => ({
          label: c.name,
          value: c.slug,
        })),
      ];
    }
    return DEFAULT_COUNTRY_OPTIONS;
  }, [apiCountries]);

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
    if (!value) return "Quốc gia";
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
          aria-label={label || "Chọn quốc gia"}
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
            className="absolute left-0 top-full z-50 mt-1.5 w-48 sm:w-52 max-w-[calc(100vw-1.5rem)] rounded-xl border border-white/10 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl animate-fadeIn"
          >
            {options.length > 8 && (
              <div className="relative mb-1.5 px-1 pt-1">
                <Search className="absolute left-3 top-3 size-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm quốc gia..."
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

export default CountryFilter;
