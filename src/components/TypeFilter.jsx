import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

const TypeFilter = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const options = [
    { label: "Tất cả loại", value: "" },
    { label: "Phim bộ", value: "series" },
    { label: "Phim lẻ", value: "single" },
  ];

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm text-slate-200" ref={containerRef}>
      <span className="text-slate-400">Loại:</span>
      <div className="relative min-w-[120px]">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-100 shadow-glass hover:bg-slate-800/70 focus:border-emerald-400 focus:outline-none transition-all duration-200 text-left"
        >
          <span>{selectedOption.label}</span>
          <ChevronDown className={`size-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950/95 p-1 shadow-2xl backdrop-blur-xl">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full rounded-md px-3 py-1.5 text-left text-xs transition-colors hover:bg-emerald-500/20 hover:text-emerald-400 ${
                  opt.value === value ? "bg-emerald-500/10 text-emerald-400 font-semibold" : "text-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TypeFilter;
