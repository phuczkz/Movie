import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import CountryFilter from "../components/CountryFilter.jsx";
import MovieCard from "../components/MovieCard.jsx";
import { useMoviesList } from "../hooks/useMoviesList.js";
import { useMoviesByCountry } from "../hooks/useMoviesByCountry.js";

const categoryLabels = {
  "hoat-hinh": "Hoạt hình",
  "hanh-dong": "Hành động",
  "tinh-cam": "Tình cảm",
  "hai-huoc": "Hài hước",
  "kinh-di": "Kinh dị",
  "tam-ly": "Tâm lý",
  "phieu-luu": "Phiêu lưu",
};

const Category = () => {
  const { category } = useParams();
  const [country, setCountry] = useState("");

  useEffect(() => {
    setCountry("");
  }, [category]);

  const isSeries = category === "phim-bo";
  const isSingle = category === "phim-le";
  const isLatest = category === "phim-moi";
  const isCategory = !isSeries && !isSingle && !isLatest;
  const hasCountry = Boolean(country);

  const { data: series = [], isLoading: loadingSeries } = useMoviesList(
    "series",
    undefined,
    { enabled: !hasCountry && isSeries }
  );
  const { data: single = [], isLoading: loadingSingle } = useMoviesList(
    "single",
    undefined,
    { enabled: !hasCountry && isSingle }
  );
  const { data: latest = [], isLoading: loadingLatest } = useMoviesList(
    "latest",
    undefined,
    { enabled: !hasCountry && isLatest }
  );
  const { data: byCategory = [], isLoading: loadingCategory } = useMoviesList(
    "category",
    category,
    { enabled: !hasCountry && isCategory }
  );
  const { data: byCountry = [], isLoading: loadingCountry } =
    useMoviesByCountry(country);

  const heading = useMemo(() => {
    if (isSeries) return "Phim bộ";
    if (isSingle) return "Phim lẻ";
    if (isLatest) return "Phim mới";
    return categoryLabels[category] || category;
  }, [isSeries, isSingle, isLatest, category]);

  const data = useMemo(() => {
    if (country) return byCountry;
    if (isSeries) return series;
    if (isSingle) return single;
    if (isLatest) return latest;
    return byCategory;
  }, [
    country,
    byCountry,
    isSeries,
    series,
    isSingle,
    single,
    isLatest,
    latest,
    byCategory,
  ]);

  const isLoading = useMemo(() => {
    if (country) return loadingCountry;
    if (isSeries) return loadingSeries;
    if (isSingle) return loadingSingle;
    if (isLatest) return loadingLatest;
    return loadingCategory;
  }, [
    country,
    loadingCountry,
    isSeries,
    loadingSeries,
    isSingle,
    loadingSingle,
    isLatest,
    loadingLatest,
    loadingCategory,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-[0.14em]">
            Danh sách
          </p>
          <h1 className="text-2xl font-bold text-white">{heading}</h1>
        </div>
        <CountryFilter value={country} onChange={setCountry} />
      </div>

      {isLoading ? (
        <div className="text-slate-400">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {data.map((movie) => (
            <MovieCard key={movie.slug} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Category;
