import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, deleteDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";
import { Film, Search, Check, X, ShieldAlert, Trash2, RefreshCw } from "lucide-react";
import { useSearchMovies } from "../../hooks/useSearchMovies";

const OVERRIDE_COLLECTION = "movieOverrides";

export default function AdminMovieStatus() {
  const [query, setQuery] = useState("");
  const [slug, setSlug] = useState("");
  const [movieName, setMovieName] = useState(""); // Display name
  const [override, setOverride] = useState(null); // null = not loaded, object = loaded
  const [trailerUrl, setTrailerUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }
  const [allOverrides, setAllOverrides] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const { data: searchResults = [], isFetching } = useSearchMovies(query);

  // Fetch all overrides on mount
  useEffect(() => {
    const unsub = onSnapshot(collection(db, OVERRIDE_COLLECTION), (snap) => {
      setAllOverrides(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const selectMovie = async (m) => {
    setQuery(m.name);
    setSlug(m.slug);
    setMovieName(m.name);
    setShowResults(false);
    setLoading(true);
    setMessage(null);
    try {
      const snap = await getDoc(doc(db, OVERRIDE_COLLECTION, m.slug));
      if (snap.exists()) {
        setOverride(snap.data());
        setTrailerUrl(snap.data().trailerUrl || "");
      } else {
        setOverride({ mode: "full" });
        setTrailerUrl("");
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSetMode = async (mode) => {
    if (!slug) return;
    setSaving(true);
    setMessage(null);
    try {
      if (mode === "full") {
        // Remove override (back to normal)
        await deleteDoc(doc(db, OVERRIDE_COLLECTION, slug));
        setOverride({ mode: "full" });
        setTrailerUrl("");
        setMessage({ type: "success", text: "Đã khôi phục chế độ xem phim đầy đủ." });
      } else {
        await setDoc(doc(db, OVERRIDE_COLLECTION, slug), {
          mode,
          name: movieName, // Store name for easier management
          trailerUrl: trailerUrl.trim(),
          updatedAt: new Date().toISOString(),
        });
        setOverride({ mode, trailerUrl: trailerUrl.trim() });
        setMessage({ type: "success", text: `Đã chuyển sang chế độ "${mode}".` });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Trạng thái phim</h2>
        <p className="text-slate-400 text-sm mt-1">
          Chuyển phim từ chế độ xem đầy đủ sang chỉ xem trailer
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            placeholder="Tìm phim theo tên (vd: Trục Ngọc...)"
            className="w-full rounded-xl bg-white/5 border border-white/10 pl-9 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none text-sm"
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl bg-slate-900 border border-white/10 shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden">
            {searchResults.map((m) => (
              <button
                key={m.slug}
                onClick={() => selectMovie(m)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 text-left transition-colors"
              >
                <div className="h-10 w-8 rounded bg-white/5 shrink-0 overflow-hidden">
                  <img src={m.poster_url || m.thumb_url} alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200 line-clamp-1">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.year}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}

      {!loading && override !== null && slug && (
        <div className="space-y-6">
          {/* Current status */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${override.mode === "trailer" ? "bg-amber-500/20" : "bg-emerald-500/20"}`}>
                <Film className={`h-5 w-5 ${override.mode === "trailer" ? "text-amber-400" : "text-emerald-400"}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">{movieName || slug}</p>
                <p className={`font-semibold ${override.mode === "trailer" ? "text-amber-400" : "text-emerald-400"}`}>
                  {override.mode === "trailer" ? "🎬 Chỉ xem Trailer" : "🎥 Xem đầy đủ"}
                </p>
              </div>
            </div>

            {/* Trailer URL input */}
            <div className="space-y-2 mb-4">
              <label className="text-sm font-semibold text-slate-300">URL Trailer (YouTube embed hoặc link trực tiếp)</label>
              <input
                type="url"
                value={trailerUrl}
                onChange={(e) => setTrailerUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/..."
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
              />
              <p className="text-xs text-slate-500">Dán link YouTube dạng embed. Bỏ trống nếu chỉ muốn ẩn player.</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {override.mode !== "trailer" ? (
                <button
                  onClick={() => handleSetMode("trailer")}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/30 px-4 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-60"
                >
                  <Film className="h-4 w-4" />
                  Chuyển sang Trailer
                </button>
              ) : (
                <button
                  onClick={() => handleSetMode("full")}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-4 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                  Khôi phục xem đầy đủ
                </button>
              )}
            </div>
          </div>

          {/* Message feedback */}
          {message && (
            <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-3 ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
            }`}>
              {message.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              {message.text}
            </div>
          )}
        </div>
      )}

      {/* List of active overrides */}
      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-bold text-white">Danh sách phim ở chế độ Trailer</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {allOverrides.filter(o => o.mode === "trailer").length === 0 ? (
            <p className="text-slate-500 text-sm py-4">Chưa có phim nào bị giới hạn.</p>
          ) : (
            allOverrides.filter(o => o.mode === "trailer").map((o) => (
              <div key={o.id} className="p-4 rounded-xl bg-slate-900/40 border border-white/5 flex items-center justify-between group">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-200 truncate">{o.name || o.id}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{o.id}</p>
                </div>
                <button
                  onClick={() => selectMovie({ slug: o.id, name: o.name || o.id })}
                  className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  title="Quản lý"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
