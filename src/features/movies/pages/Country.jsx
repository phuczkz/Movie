import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import CountryFilter from '@/components/CountryFilter.jsx';
import GenreFilter from '@/components/GenreFilter.jsx';
import YearFilter from '@/components/YearFilter.jsx';
import MovieCard from '@/features/movies/components/MovieCard.jsx';
import GridSkeleton from '@/components/GridSkeleton.jsx';
import { useKKphimByCountry, useMovieCountries } from '@/features/movies/hooks/useKKphimMovies.js';
import { isForbiddenGenre } from '@/utils/filter.js';
import Pagination from '@/components/Pagination.jsx';
import SEO from '@/components/SEO.jsx';
import { Film } from "lucide-react";

const countryLabels = {
  "viet-nam": "Việt Nam",
  "han-quoc": "Hàn Quốc",
  "nhat-ban": "Nhật Bản",
  "trung-quoc": "Trung Quốc",
  "au-my": "Âu Mỹ",
  "thai-lan": "Thái Lan",
  my: "Mỹ",
  anh: "Anh",
};

const Country = () => {
  const { country, page: pageParam } = useParams();
  const [searchParams] = useSearchParams();
  const genreParam = searchParams.get("genre") || "";
  const yearParam = searchParams.get("year") || "";
  const navigate = useNavigate();
  const pageFromUrl = Math.max(1, Number(pageParam) || 1);
  const page = pageFromUrl;

  const isForbidden = isForbiddenGenre(genreParam);

  const { data: dynamicCountries = [] } = useMovieCountries();

  const goToPage = (nextPage) => {
    const safePage = Math.max(1, nextPage);
    const queryString = searchParams.toString();
    const query = queryString ? `?${queryString}` : "";
    navigate(`/country/${country}${safePage > 1 ? `/${safePage}` : ""}${query}`);
  };

  const { data: kkphim = [], isLoading } = useKKphimByCountry(
    country || "",
    {
      page,
      enabled: Boolean(country) && !isForbidden,
      category: genreParam,
      year: yearParam,
    }
  );

  const movies = useMemo(() => {
    return kkphim || [];
  }, [kkphim]);

  const pagedData = useMemo(() => {
    const hasNext = movies.length >= 24;
    return { items: movies, hasNext };
  }, [movies]);

  const heading = useMemo(() => {
    const found = dynamicCountries.find((c) => c.slug === country);
    if (found?.name) return found.name;
    return countryLabels[country] || country;
  }, [country, dynamicCountries]);

  const updateFilterParams = (updater) => {
    const newParams = new URLSearchParams(searchParams);
    updater(newParams);
    const queryString = newParams.toString();
    navigate(`/country/${country}${queryString ? `?${queryString}` : ""}`);
  };

  const handleChange = (value) => {
    if (!value) {
      // Chuyển về "Tất cả quốc gia"
      const newParams = new URLSearchParams(searchParams);
      if (genreParam) {
        newParams.delete("genre");
        const queryString = newParams.toString();
        navigate(`/category/${genreParam}${queryString ? `?${queryString}` : ""}`);
      } else {
        const queryString = newParams.toString();
        navigate(`/category/phim-moi${queryString ? `?${queryString}` : ""}`);
      }
      return;
    }
    const queryString = searchParams.toString();
    navigate(`/country/${value}${queryString ? `?${queryString}` : ""}`);
  };

  const handleGenreChange = (value) => {
    updateFilterParams((p) => {
      if (value) p.set("genre", value);
      else p.delete("genre");
    });
  };

  const handleYearChange = (value) => {
    updateFilterParams((p) => {
      if (value) p.set("year", value);
      else p.delete("year");
    });
  };

  if (isForbidden) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Nội dung không khả dụng</h2>
        <p className="text-slate-400 text-sm max-w-md">
          Thể loại phim này không tồn tại hoặc đã bị hạn chế trên hệ thống.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 text-emerald-950 font-semibold text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col flex-1">
      <SEO title={`Danh sách phim ${heading} ${yearParam}`.trim()} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs sm:text-sm text-slate-400 uppercase tracking-[0.14em]">
            Quốc gia
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{heading}</h1>
        </div>
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <CountryFilter value={country || ""} onChange={handleChange} />
          <GenreFilter value={genreParam} onChange={handleGenreChange} />
          <YearFilter value={yearParam} onChange={handleYearChange} />
        </div>
      </div>

      {(genreParam || yearParam) && (
        <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
          <span className="text-slate-400">Đang lọc:</span>
          {genreParam && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium">
              <span>{genreParam}</span>
              <button
                type="button"
                onClick={() => handleGenreChange("")}
                aria-label="Xoá lọc thể loại"
                className="hover:text-white"
              >
                ✕
              </button>
            </span>
          )}
          {yearParam && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium">
              <span>Năm {yearParam}</span>
              <button
                type="button"
                onClick={() => handleYearChange("")}
                aria-label="Xoá lọc năm"
                className="hover:text-white"
              >
                ✕
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => navigate(`/country/${country}`)}
            className="text-xs text-rose-400 hover:text-rose-300 underline ml-1 transition-colors"
          >
            Xóa tất cả
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4">
          <GridSkeleton count={14} className="" />
        </div>
      ) : movies.length ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {pagedData.items.map((movie) => (
              <MovieCard key={movie.slug} movie={movie} />
            ))}
          </div>
          {(pagedData.hasNext || page > 1) && (
            <Pagination
              currentPage={page}
              hasNext={pagedData.hasNext}
              onPageChange={goToPage}
            />
          )}
        </>
      ) : (
        <div className="flex-1 min-h-[30vh] flex flex-col items-center justify-center text-center px-4 py-12">
          <div className="size-16 rounded-2xl bg-slate-800/80 border border-white/10 flex items-center justify-center mb-4 shadow-lg text-slate-500">
            <Film className="size-8" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Không tìm thấy phim phù hợp</h2>
          <p className="text-slate-400 text-sm max-w-sm">
            Hiện chưa có phim nào phù hợp với bộ lọc đã chọn. Vui lòng thử chọn lại thể loại, quốc gia hoặc năm khác.
          </p>
        </div>
      )}
    </div>
  );
};

export default Country;
