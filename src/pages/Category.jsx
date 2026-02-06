import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import MovieCard from "../components/MovieCard.jsx";
import { useMoviesList } from "../hooks/useMoviesList.js";
import {
  useKKphimByCategory,
  useKKphimMovies,
} from "../hooks/useKKphimMovies.js";
import { searchKKphim } from "../api/kkphim";

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
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setPage(1);
  }, [category]);

  const isSeries = category === "phim-bo";
  const isSingle = category === "phim-le";
  const isLatest = category === "phim-moi";
  const isAnimation = category === "hoat-hinh";
  const isCategory = !isSeries && !isSingle && !isLatest;

  const { data: seriesOphim = [], isLoading: loadingSeriesOphim } =
    useMoviesList("series", undefined, { enabled: isSeries });
  const { data: seriesKK = [], isLoading: loadingSeriesKK } = useKKphimMovies(
    "series",
    { enabled: isSeries }
  );

  const { data: singleOphim = [], isLoading: loadingSingleOphim } =
    useMoviesList("single", undefined, { enabled: isSingle });
  const { data: singleKK = [], isLoading: loadingSingleKK } = useKKphimMovies(
    "single",
    { enabled: isSingle }
  );

  const { data: latestOphim = [], isLoading: loadingLatestOphim } =
    useMoviesList("latest", undefined, { enabled: isLatest });
  const { data: latestKK = [], isLoading: loadingLatestKK } = useKKphimMovies(
    "latest",
    { enabled: isLatest }
  );

  const { data: byCategory = [], isLoading: loadingCategory } = useMoviesList(
    "category",
    category,
    { enabled: isCategory }
  );
  const { data: kkCategory = [], isLoading: loadingKKCategory } =
    useKKphimByCategory(category, { enabled: isCategory });
  // KKphim không có slug "hoat-hinh", dùng search để lấy dữ liệu
  const { data: kkAnimation = [], isLoading: loadingKKAnimation } = useQuery({
    queryKey: ["kkphim", "search", "hoat-hinh"],
    queryFn: () => searchKKphim("hoat hinh"),
    enabled: isAnimation,
    staleTime: 5 * 60 * 1000,
  });

  const heading = useMemo(() => {
    if (isSeries) return "Phim bộ";
    if (isSingle) return "Phim lẻ";
    if (isLatest) return "Phim mới";
    return categoryLabels[category] || category;
  }, [isSeries, isSingle, isLatest, category]);

  const data = useMemo(() => {
    const mergeUnique = (...lists) => {
      const map = new Map();
      lists.flat().forEach((m) => {
        if (!m || !m.slug) return;
        if (!map.has(m.slug)) map.set(m.slug, m);
      });
      return Array.from(map.values());
    };

    if (isSeries) return mergeUnique(seriesKK, seriesOphim);
    if (isSingle) return mergeUnique(singleKK, singleOphim);
    if (isLatest) return mergeUnique(latestKK, latestOphim);

    const mergedCategory = mergeUnique(
      isAnimation ? kkAnimation : kkCategory,
      byCategory
    );
    return mergedCategory;
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
    byCategory,
    kkCategory,
    kkAnimation,
  ]);

  const isLoading = useMemo(() => {
    if (isSeries) return loadingSeriesOphim || loadingSeriesKK;
    if (isSingle) return loadingSingleOphim || loadingSingleKK;
    if (isLatest) return loadingLatestOphim || loadingLatestKK;
    return (
      loadingCategory ||
      loadingKKCategory ||
      (isAnimation ? loadingKKAnimation : false)
    );
  }, [
    loadingSeriesOphim,
    loadingSeriesKK,
    loadingSingleOphim,
    loadingSingleKK,
    loadingLatestOphim,
    loadingLatestKK,
    loadingKKCategory,
    loadingKKAnimation,
    isAnimation,
  ]);

  const totalPages = Math.max(1, Math.ceil((data?.length || 0) / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-[0.14em]">
            Danh sách
          </p>
          <h1 className="text-2xl font-bold text-white">{heading}</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="text-slate-400">Đang tải...</div>
      ) : (
        <>
          <div className="grid-movies">
            {pagedData.map((movie) => (
              <MovieCard key={movie.slug} movie={movie} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4 text-sm text-white">
              <button
                className="rounded-lg border border-white/10 px-3 py-2 hover:border-white/30 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Trước
              </button>
              <span className="px-2">
                Trang {page} / {totalPages}
              </span>
              <button
                className="rounded-lg border border-white/10 px-3 py-2 hover:border-white/30 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Category;
