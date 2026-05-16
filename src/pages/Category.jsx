import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import MovieCard from "../components/MovieCard.jsx";
import GridSkeleton from "../components/GridSkeleton.jsx";
import CountryFilter from "../components/CountryFilter.jsx";
import { useMoviesList } from "../hooks/useMoviesList.js";
import Pagination from "../components/Pagination.jsx";
import {
  useKKphimByCategory,
  useKKphimMovies,
} from "../hooks/useKKphimMovies.js";
import { useChieuRapMerged } from "../hooks/useChieuRapMerged.js";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const countryParam = searchParams.get("country") || "";
  const navigate = useNavigate();
  const pageFromUrl = Math.max(1, Number(pageParam) || 1);
  const page = pageFromUrl;
  const pageSize = 20;

  const goToPage = (nextPage) => {
    const safePage = Math.max(1, nextPage);
    const query = countryParam ? `?country=${countryParam}` : "";
    navigate(
      `/category/${category}${safePage > 1 ? `/${safePage}` : ""}${query}`
    );
  };

  const isSeries = category === "phim-bo";
  const isSingle = category === "phim-le";
  const isLatest = category === "phim-moi";
  const isChieuRap = category === "phim-chieu-rap";
  const isCategory = !isSeries && !isSingle && !isLatest && !isChieuRap;

  const { data: seriesOphim = [], isLoading: loadingSeriesOphim } =
    useMoviesList("series", undefined, {
      enabled: isSeries,
      page,
      country: countryParam,
    });
  const { data: seriesKK = [], isLoading: loadingSeriesKK } = useKKphimMovies(
    "series",
    { enabled: isSeries, page, country: countryParam }
  );

  const { data: singleOphim = [], isLoading: loadingSingleOphim } =
    useMoviesList("single", undefined, {
      enabled: isSingle,
      page,
      country: countryParam,
    });
  const { data: singleKK = [], isLoading: loadingSingleKK } = useKKphimMovies(
    "single",
    { enabled: isSingle, page, country: countryParam }
  );

  const { data: latestOphim = [], isLoading: loadingLatestOphim } =
    useMoviesList("latest", undefined, {
      enabled: isLatest,
      page,
      country: countryParam,
    });
  const { data: latestKK = [], isLoading: loadingLatestKK } = useKKphimMovies(
    "latest",
    { enabled: isLatest, page, country: countryParam }
  );

  const { data: mergedChieuRap = [], isLoading: loadingChieuRap } =
    useChieuRapMerged(page, { enabled: isChieuRap, country: countryParam });

  const { data: byCategory = [], isLoading: loadingCategory } = useMoviesList(
    "category",
    category,
    { enabled: isCategory, page, country: countryParam }
  );
  const { data: kkCategory = [], isLoading: loadingKKCategory } =
    useKKphimByCategory(category, {
      enabled: isCategory,
      page,
      country: countryParam,
    });

  const heading = useMemo(() => {
    if (isSeries) return "Phim bộ";
    if (isSingle) return "Phim lẻ";
    if (isLatest) return "Phim mới";
    if (isChieuRap) return "Phim chiếu rạp";
    return categoryLabels[category] || category;
  }, [isSeries, isSingle, isLatest, isChieuRap, category]);

  const mergedData = useMemo(() => {
    const mergeUnique = (...lists) => {
      const map = new Map();
      lists.flat().forEach((m) => {
        if (!m || !m.slug) return;
        if (!map.has(m.slug)) map.set(m.slug, m);
      });
      return Array.from(map.values());
    };

    let result = [];
    if (isSeries) result = mergeUnique(seriesKK, seriesOphim);
    else if (isSingle) result = mergeUnique(singleKK, singleOphim);
    else if (isLatest) result = mergeUnique(latestKK, latestOphim);
    else if (isChieuRap) result = mergedChieuRap;
    else result = mergeUnique(kkCategory, byCategory);

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

    return result;
  }, [
    isSeries,
    seriesKK,
    seriesOphim,
    isSingle,
    singleKK,
    singleOphim,
    isLatest,
    latestKK,
    latestOphim,
    isChieuRap,
    mergedChieuRap,
    byCategory,
    kkCategory,
    countryParam,
  ]);

  const isLoading = useMemo(() => {
    if (isSeries) return loadingSeriesOphim || loadingSeriesKK;
    if (isSingle) return loadingSingleOphim || loadingSingleKK;
    if (isLatest) return loadingLatestOphim || loadingLatestKK;
    if (isChieuRap) return loadingChieuRap;
    return loadingCategory || loadingKKCategory;
  }, [
    isSeries,
    loadingSeriesOphim,
    loadingSeriesKK,
    isSingle,
    loadingSingleOphim,
    loadingSingleKK,
    isLatest,
    loadingLatestOphim,
    loadingLatestKK,
    isChieuRap,
    loadingChieuRap,
    loadingCategory,
    loadingKKCategory,
  ]);

  const pagedData = useMemo(() => {
    const limited = mergedData.slice(0, pageSize);
    const hasNext = mergedData.length >= pageSize;
    return { items: limited, hasNext };
  }, [mergedData, pageSize]);

  const handleCountryChange = (value) => {
    if (value) {
      setSearchParams({ country: value });
    } else {
      searchParams.delete("country");
      setSearchParams(searchParams);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-[0.14em]">
            Danh sách
          </p>
          <h1 className="text-2xl font-bold text-white">{heading}</h1>
        </div>
        {category !== "hoat-hinh" && (
          <CountryFilter value={countryParam} onChange={handleCountryChange} />
        )}
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
