import MovieCard from "../components/MovieCard.jsx";
import ComicCard from "../components/comics/ComicCard.jsx";
import { useSearchMovies } from "../hooks/useSearchMovies.js";
import { useSearchParams } from "react-router-dom";
import { useAppMode } from "../context/AppModeContext.jsx";

const Search = () => {
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const { appMode } = useAppMode();
  const isComicMode = appMode === "comic";
  
  const { data = [], isFetching } = useSearchMovies(query, appMode);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-slate-400 uppercase tracking-[0.14em]">
          Tìm kiếm
        </p>
        <h1 className="text-2xl font-bold text-white">
          {query
            ? `Kết quả cho "${query}"`
            : "Nhập tên, thể loại hoặc quốc gia"}
        </h1>

      </div>

      {isFetching && (
        <div className="flex h-[40vh] w-full items-center justify-center">
          <div className="loader-orbit loader-orbit-md"></div>
        </div>
      )}

      {!query && (
        <p className="text-slate-400">
          Thử: "hoạt hình", "hàn quốc", "hành động"...
        </p>
      )}

      {query ? (
        data.length ? (
          <div className={isComicMode ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 xl:gap-6" : "grid-movies"}>
            {data.map((item) => (
              isComicMode ? (
                <ComicCard key={item.slug} comic={item} />
              ) : (
                <MovieCard key={item.slug} movie={item} />
              )
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
