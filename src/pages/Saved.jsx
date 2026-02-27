import { Link } from "react-router-dom";
import MovieCard from "../components/MovieCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSavedMoviesList } from "../hooks/useSavedMoviesList.js";

const Saved = () => {
  const { user } = useAuth();
  const { movies, loading, error } = useSavedMoviesList();

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 text-center">
        <h1 className="text-3xl font-bold text-white">Phim yêu thích</h1>
        <p className="text-slate-300">
          Vui lòng <Link className="text-emerald-400 underline" to="/login">đăng nhập</Link> để xem danh sách phim yêu thích.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Phim yêu thích</h1>
        <p className="text-slate-300 text-sm">
          {loading ? "Đang tải danh sách..." : `Tổng cộng ${movies.length} phim.`}
        </p>
        {error ? (
          <p className="text-sm text-amber-200 font-semibold">
            {error.message || "Không thể tải danh sách, thử lại sau."}
          </p>
        ) : null}
      </div>

      {loading && !movies.length ? (
        <p className="text-slate-400">Đang tải...</p>
      ) : movies.length ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {movies.map((movie) => (
            <MovieCard key={movie.slug || movie.id} movie={movie} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-slate-300">
          Bạn chưa thêm phim nào vào Yêu thích.
        </div>
      )}
    </div>
  );
};

export default Saved;
