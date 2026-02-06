import MovieCard from "../components/MovieCard.jsx";
import SearchBar from "../components/SearchBar.jsx";
import { useSearchMovies } from "../hooks/useSearchMovies.js";
import { useSearchParams } from "react-router-dom";

const Search = () => {
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const { data = [], isFetching } = useSearchMovies(query);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-slate-400 uppercase tracking-[0.14em]">
          Tìm kiếm
        </p>
        <h1 className="text-2xl font-bold text-white">
          {query ? `Kết quả cho "${query}"` : "Nhập từ khóa để tìm phim"}
        </h1>
        <SearchBar autoFocus placeholder="Nhập tên phim..." />
      </div>

      {isFetching && <div className="text-slate-300">Đang tìm kiếm...</div>}

      {!query && (
        <p className="text-slate-400">Bắt đầu với một từ khóa bất kỳ.</p>
      )}

      {query ? (
        data.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {data.map((movie) => (
              <MovieCard key={movie.slug} movie={movie} />
            ))}
          </div>
        ) : (
          <p className="text-slate-400">Không tìm thấy kết quả.</p>
        )
      ) : null}
    </div>
  );
};

export default Search;
