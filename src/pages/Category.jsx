import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
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
  const { category, page: pageParam } = useParams();
  const navigate = useNavigate();
  const pageFromUrl = Math.max(1, Number(pageParam) || 1);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setPage(pageFromUrl);
  }, [category, pageFromUrl]);

  const goToPage = (nextPage) => {
    const safePage = Math.max(1, nextPage);
    setPage(safePage);
    navigate(`/category/${category}${safePage > 1 ? `/${safePage}` : ""}`);
  };

  const isSeries = category === "phim-bo";
  const isSingle = category === "phim-le";
  const isLatest = category === "phim-moi";
  const isAnimation = category === "hoat-hinh";
  const isCategory = !isSeries && !isSingle && !isLatest;

  const { data: seriesOphim = [], isLoading: loadingSeriesOphim } =
    useMoviesList("series", undefined, { enabled: isSeries, page });
  const { data: seriesKK = [], isLoading: loadingSeriesKK } = useKKphimMovies(
    "series",
    { enabled: isSeries, page }
  );

  const { data: singleOphim = [], isLoading: loadingSingleOphim } =
    useMoviesList("single", undefined, { enabled: isSingle, page });
  const { data: singleKK = [], isLoading: loadingSingleKK } = useKKphimMovies(
    "single",
    { enabled: isSingle, page }
  );

  const { data: latestOphim = [], isLoading: loadingLatestOphim } =
    useMoviesList("latest", undefined, { enabled: isLatest, page });
  const { data: latestKK = [], isLoading: loadingLatestKK } = useKKphimMovies(
    "latest",
    { enabled: isLatest, page }
  );

  const { data: byCategory = [], isLoading: loadingCategory } = useMoviesList(
    "category",
    category,
    { enabled: isCategory, page }
  );
  const { data: kkCategory = [], isLoading: loadingKKCategory } =
    useKKphimByCategory(category, { enabled: isCategory, page });
  // KKphim không có slug "hoat-hinh", dùng search để lấy dữ liệu
  const { data: kkAnimation = [], isLoading: loadingKKAnimation } = useQuery({
    queryKey: ["kkphim", "search", "hoat-hinh", page],
    queryFn: () => searchKKphim("hoat hinh", page),
    enabled: isAnimation,
    staleTime: 5 * 60 * 1000,
  });

  const heading = useMemo(() => {
    if (isSeries) return "Phim bộ";
    if (isSingle) return "Phim lẻ";
    if (isLatest) return "Phim mới";
    return categoryLabels[category] || category;
  }, [isSeries, isSingle, isLatest, category]);

  const mergedData = useMemo(() => {
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
    isAnimation,
    page,
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
    isSeries,
    loadingSeriesOphim,
    loadingSeriesKK,
    isSingle,
    loadingSingleOphim,
    loadingSingleKK,
    isLatest,
    loadingLatestOphim,
    loadingLatestKK,
    loadingCategory,
    loadingKKCategory,
    loadingKKAnimation,
    isAnimation,
  ]);

  const pagedData = useMemo(() => {
    const limited = mergedData.slice(0, pageSize);
    const hasNext = mergedData.length >= pageSize;
    return { items: limited, hasNext };
  }, [mergedData, pageSize]);

  const pages = useMemo(() => {
    const maxPage = pagedData.hasNext ? page + 1 : page;
    return Array.from({ length: maxPage }, (_, idx) => idx + 1);
  }, [page, pagedData.hasNext]);

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
            {pagedData.items.map((movie) => (
              <MovieCard key={movie.slug} movie={movie} />
            ))}
          </div>

          {(pagedData.hasNext || page > 1) && (
            <div className="flex justify-center items-center gap-2 pt-4 text-sm text-white">
              <button
                className="rounded-lg border border-white/10 px-3 py-2 hover:border-white/30 disabled:opacity-50"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
              >
                Trước
              </button>
              <div className="flex items-center gap-1">
                {pages.map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`rounded-lg border px-3 py-2 transition-colors ${
                      p === page
                        ? "border-white bg-white text-slate-900"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                {pagedData.hasNext && (
                  <span className="px-2 text-slate-300">...</span>
                )}
              </div>
              <button
                className="rounded-lg border border-white/10 px-3 py-2 hover:border-white/30 disabled:opacity-50"
                onClick={() => goToPage(page + 1)}
                disabled={!pagedData.hasNext}
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
