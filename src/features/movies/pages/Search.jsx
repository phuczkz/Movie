import MovieCard from '@/features/movies/components/MovieCard.jsx';
import ComicCard from '@/features/comics/components/ComicCard.jsx';
import { useSearchMovies } from '@/features/movies/hooks/useSearchMovies.js';
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import { useAppMode } from '@/context/AppModeContext.jsx';

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
          <div className="min-h-[35vh] flex flex-col items-center justify-center text-center px-6">
            <div className="size-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center mb-4 shadow-lg">
              <SearchIcon className="size-8 text-slate-500" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Không tìm thấy kết quả</h2>
            <p className="text-slate-400 text-sm max-w-sm">
              Thử tìm với từ khóa khác hoặc kiểm tra lại chính tả.
            </p>
          </div>
        )
      ) : null}
    </div>
  );
};

export default Search;
