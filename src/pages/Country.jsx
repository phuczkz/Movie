import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CountryFilter from "../components/CountryFilter.jsx";
import MovieCard from "../components/MovieCard.jsx";
import { useMoviesByCountry } from "../hooks/useMoviesByCountry.js";
import { useKKphimByCountry } from "../hooks/useKKphimMovies.js";

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
  const navigate = useNavigate();
  const pageFromUrl = Math.max(1, Number(pageParam) || 1);
  const page = pageFromUrl;
  const pageSize = 20;

  const goToPage = (nextPage) => {
    const safePage = Math.max(1, nextPage);
    navigate(`/country/${country}${safePage > 1 ? `/${safePage}` : ""}`);
  };

  const { data: ophim = [], isLoading: loadingOphim } = useMoviesByCountry(
    country || "",
    { page, enabled: Boolean(country) }
  );
  const { data: kkphim = [], isLoading: loadingKK } = useKKphimByCountry(
    country || "",
    { page, enabled: Boolean(country) }
  );

  const movies = useMemo(() => {
    const map = new Map();
    [...kkphim, ...ophim].forEach((m) => {
      if (!m || !m.slug) return;
      if (!map.has(m.slug)) map.set(m.slug, m);
    });
    return Array.from(map.values());
  }, [kkphim, ophim]);

  const pagedData = useMemo(() => {
    const limited = movies.slice(0, pageSize);
    const hasNext = movies.length >= pageSize;
    return { items: limited, hasNext };
  }, [movies, pageSize]);

  const isLoading = loadingOphim || loadingKK;

  const heading = useMemo(() => countryLabels[country] || country, [country]);

  const handleChange = (value) => {
    if (!value) return;
    navigate(`/country/${value}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-[0.14em]">
            Quốc gia
          </p>
          <h1 className="text-2xl font-bold text-white">{heading}</h1>
        </div>
        <CountryFilter value={country || ""} onChange={handleChange} />
      </div>

      {isLoading ? (
        <div className="text-slate-400">Đang tải...</div>
      ) : movies.length ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                {Array.from(
                  { length: pagedData.hasNext ? page + 1 : page },
                  (_, idx) => idx + 1
                ).map((p) => (
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
      ) : (
        <div className="text-slate-400">Không có dữ liệu.</div>
      )}
    </div>
  );
};

export default Country;
