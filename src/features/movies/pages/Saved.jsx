import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import MovieCard from '@/features/movies/components/MovieCard.jsx';
import { useAuth } from '@/features/auth/context/AuthContext.jsx';
import { useSavedMoviesList } from '@/features/movies/hooks/useSavedMoviesList.js';
import SEO from '@/components/SEO.jsx';

const Saved = () => {
  const { user } = useAuth();
  const { movies, loading, error } = useSavedMoviesList();

  if (!user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-6">
        <SEO title="Phim yêu thích" />
        <div className="size-20 rounded-3xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-500/20 flex items-center justify-center mb-6 shadow-lg">
          <Heart className="size-10 text-rose-400/60" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Phim yêu thích</h1>
        <p className="text-slate-400 text-sm max-w-md mb-6">
          Đăng nhập để lưu những bộ phim bạn yêu thích và xem lại bất cứ lúc nào.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5"
        >
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEO title={`Danh sách phim yêu thích`} />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Phim yêu thích</h1>
        <p className="text-slate-300 text-sm">
          {loading ? "Đang tải danh sách…" : `Tổng cộng ${movies.length} phim.`}
        </p>
        {error ? (
          <p className="text-sm text-amber-200 font-semibold">
            {error.message || "Không thể tải danh sách, thử lại sau."}
          </p>
        ) : null}
      </div>

      {loading && !movies.length ? (
        <div className="flex h-[40vh] w-full items-center justify-center">
          <div className="loader-orbit loader-orbit-md"></div>
        </div>
      ) : movies.length ? (
        <div className="grid-movies">
          {movies.map((movie) => (
            <MovieCard key={movie.slug || movie.id} movie={movie} />
          ))}
        </div>
      ) : (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center px-6">
          <div className="size-20 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center mb-6 shadow-lg">
            <Heart className="size-10 text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Chưa có phim yêu thích</h2>
          <p className="text-slate-400 text-sm max-w-sm mb-6">
            Hãy nhấn vào biểu tượng ♥ trên bất kỳ bộ phim nào để thêm vào danh sách yêu thích của bạn.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5"
          >
            Khám phá phim mới
          </Link>
        </div>
      )}
    </div>
  );
};

export default Saved;
