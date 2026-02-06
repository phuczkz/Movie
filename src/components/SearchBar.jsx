import { Search } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const SearchBar = ({
  placeholder = "Tìm phim...",
  autoFocus = false,
  className = "",
}) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");

  const onSubmit = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={onSubmit} className={`relative w-full ${className}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full h-12 rounded-2xl bg-white/10 pl-12 pr-4 text-sm sm:text-base text-white placeholder:text-slate-200/70 border border-white/10 shadow-glass outline-none focus:border-white/40 focus:ring-2 focus:ring-white/30 backdrop-blur"
      />
    </form>
  );
};

export default SearchBar;
