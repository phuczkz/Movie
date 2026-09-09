import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import MovieCard from '@/features/movies/components/MovieCard.jsx';
import GridSkeleton from '@/components/GridSkeleton.jsx';
import CountryFilter from '@/components/CountryFilter.jsx';
import GenreFilter from '@/components/GenreFilter.jsx';
import YearFilter from '@/components/YearFilter.jsx';
import Pagination from '@/components/Pagination.jsx';
import {
  useKKphimByCategory,
  useKKphimMovies,
  useMovieGenres,
} from '@/features/movies/hooks/useKKphimMovies.js';
import { useChieuRapMerged } from '@/features/movies/hooks/useChieuRapMerged.js';
import { useHoatHinhMerged } from '@/features/movies/hooks/useHoatHinhMerged.js';
import { isForbiddenGenre } from '@/utils/filter.js';
import SEO from '@/components/SEO.jsx';

const categoryLabels = {
  "hoat-hinh": "Hoạt hình",
  "hanh-dong": "Hành động",
  "tinh-cam": "Tình cảm",
  "hai-huoc": "Hài hước",
  "kinh-di": "Kinh dị",
  "tam-ly": "Tâm lý",
  "phieu-luu": "Phiêu lưu",
  "phim-thuyet-minh": "Thuyết minh",
};

const Category = () => {
  const { category, page: pageParam } = useParams();
  const [searchParams] = useSearchParams();
  const countryParam = searchParams.get("country") || "";
  const genreParam = searchParams.get("genre") || "";
  const yearParam = searchParams.get("year") || "";
  const navigate = useNavigate();
  const pageFromUrl = Math.max(1, Number(pageParam) || 1);
  const page = pageFromUrl;

  const isForbidden = isForbiddenGenre(category) || (genreParam && isForbiddenGenre(genreParam));

  const goToPage = (nextPage) => {
    const safePage = Math.max(1, nextPage);
    const queryString = searchParams.toString();
    const query = queryString ? `?${queryString}` : "";
    navigate(
      `/category/${category}${safePage > 1 ? `/${safePage}` : ""}${query}`
    );
  };

  const isSeries = category === "phim-bo";
  const isSingle = category === "phim-le";
  const isLatest = category === "phim-moi";
  const isChieuRap = category === "phim-chieu-rap";
  const isHoatHinh = category === "hoat-hinh";
  const isCategory = !isSeries && !isSingle && !isLatest && !isChieuRap && !isHoatHinh;

  const { data: dynamicGenres = [] } = useMovieGenres();

  const { data: seriesKK = [], isLoading: loadingSeriesKK } = useKKphimMovies(
    "series",
    {
      enabled: isSeries && !isForbidden,
      page,
      country: countryParam,
      year: yearParam,
      category: genreParam,
    }
  );

  const { data: singleKK = [], isLoading: loadingSingleKK } = useKKphimMovies(
    "single",
    {
      enabled: isSingle && !isForbidden,
      page,
      country: countryParam,
      year: yearParam,
      category: genreParam,
    }
  );

  const { data: latestKK = [], isLoading: loadingLatestKK } = useKKphimMovies(
    "latest",
    {
      enabled: isLatest && !isForbidden,
      page,
      country: countryParam,
      year: yearParam,
      category: genreParam,
    }
  );

  const { data: mergedChieuRap = [], isLoading: loadingChieuRap } =
    useChieuRapMerged(page, {
      enabled: isChieuRap && !isForbidden,
      country: countryParam,
      year: yearParam,
      category: genreParam,
    });

  const { data: mergedHoatHinh = [], isLoading: loadingHoatHinh } =
    useHoatHinhMerged(page, {
      enabled: isHoatHinh && !isForbidden,
      country: countryParam,
      year: yearParam,
      category: genreParam,
    });

  const { data: kkCategory = [], isLoading: loadingKKCategory } =
    useKKphimByCategory(category, {
      enabled: isCategory && !isForbidden,
      page,
      country: countryParam,
      year: yearParam,
    });

  const heading = useMemo(() => {
    if (isSeries) return "Phim bộ";
    if (isSingle) return "Phim lẻ";
    if (isLatest) return "Phim mới";
    if (isChieuRap) return "Phim chiếu rạp";
    if (isHoatHinh) return "Hoạt hình";
    const found = dynamicGenres.find((g) => g.slug === category);
    if (found?.name) return found.name;
    return categoryLabels[category] || category;
  }, [isSeries, isSingle, isLatest, isChieuRap, isHoatHinh, category, dynamicGenres]);

  const mergedData = useMemo(() => {
    let result = [];
    if (isSeries) result = seriesKK;
    else if (isSingle) result = singleKK;
    else if (isLatest) result = latestKK;
    else if (isChieuRap) result = mergedChieuRap;
    else if (isHoatHinh) result = mergedHoatHinh;
    else result = kkCategory;

    // For latestKK (/danh-sach/phim-moi-cap-nhat), apply client-side filtering as fallback
    // because that specific endpoint does not filter server-side
    if (isLatest) {
      if (countryParam) {
        result = result.filter((m) => {
          if (!m.country) return false;
          if (Array.isArray(m.country)) {
            return m.country.some(
              (c) => (typeof c === "string" ? c : c.slug) === countryParam
            );
          }
          return false;
        });
      }

      if (genreParam) {
        result = result.filter((m) => {
          if (!m.category) return false;
          if (Array.isArray(m.category)) {
            return m.category.some(
              (c) => (typeof c === "string" ? c : c.slug) === genreParam
            );
          }
          return false;
        });
      }

      if (yearParam) {
        result = result.filter(
          (m) => m.year && String(m.year) === String(yearParam)
        );
      }
    }

    return result;
  }, [
    isChieuRap,
    isHoatHinh,
    isLatest,
    isSeries,
    isSingle,
    latestKK,
    mergedChieuRap,
    mergedHoatHinh,
    seriesKK,
    singleKK,
    kkCategory,
    countryParam,
    genreParam,
    yearParam,
  ]);

  const isLoading = useMemo(() => {
    if (isSeries) return loadingSeriesKK;
    if (isSingle) return loadingSingleKK;
    if (isLatest) return loadingLatestKK;
    if (isChieuRap) return loadingChieuRap;
    if (isHoatHinh) return loadingHoatHinh;
    return loadingKKCategory;
  }, [
    isSeries,
    loadingSeriesKK,
    isSingle,
    loadingSingleKK,
    isLatest,
    loadingLatestKK,
    isChieuRap,
    loadingChieuRap,
    isHoatHinh,
    loadingHoatHinh,
    loadingKKCategory,
  ]);

  const pagedData = useMemo(() => {
    const hasNext = mergedData.length >= 24;
    return { items: mergedData, hasNext };
  }, [mergedData]);

  const updateFilterParams = (updater) => {
    const newParams = new URLSearchParams(searchParams);
    updater(newParams);
    const queryString = newParams.toString();
    navigate(`/category/${category}${queryString ? `?${queryString}` : ""}`);
  };

  const handleCountryChange = (value) => {
    updateFilterParams((p) => {
      if (value) p.set("country", value);
      else p.delete("country");
    });
  };

  const handleGenreChange = (value) => {
    if (isCategory) {
      const newParams = new URLSearchParams(searchParams);
      if (value) {
        const queryString = newParams.toString();
        navigate(`/category/${value}${queryString ? `?${queryString}` : ""}`);
      } else {
        // Chuyển về "Tất cả thể loại"
        if (countryParam) {
          newParams.delete("country");
          const queryString = newParams.toString();
          navigate(`/country/${countryParam}${queryString ? `?${queryString}` : ""}`);
        } else {
          const queryString = newParams.toString();
          navigate(`/category/phim-moi${queryString ? `?${queryString}` : ""}`);
        }
      }
      return;
    }
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
    <div className="space-y-6">
      <SEO title={`Danh sách ${heading.toLowerCase().startsWith('phim') ? heading : 'Phim ' + heading} ${countryParam} ${yearParam}`.trim()} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-[0.14em]">
            Danh sách
          </p>
          <h1 className="text-2xl font-bold text-white">{heading}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <CountryFilter value={countryParam} onChange={handleCountryChange} />
          <GenreFilter
            value={isCategory ? category : genreParam}
            onChange={handleGenreChange}
          />
          <YearFilter value={yearParam} onChange={handleYearChange} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[60vh] w-full items-center justify-center">
          <div className="loader-orbit loader-orbit-lg"></div>
        </div>
      ) : (
        <>
          <div className="grid-movies">
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
      )}
    </div>
  );
};

export default Category;
