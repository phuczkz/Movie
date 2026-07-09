import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import CountryFilter from "../components/CountryFilter.jsx";
import YearFilter from "../components/YearFilter.jsx";
import TypeFilter from "../components/TypeFilter.jsx";
import MovieCard from "../components/MovieCard.jsx";
import GridSkeleton from "../components/GridSkeleton.jsx";
import { useMoviesByCountry } from "../hooks/useMoviesByCountry.js";
import { useKKphimByCountry } from "../hooks/useKKphimMovies.js";
import Pagination from "../components/Pagination.jsx";
import SEO from "../components/SEO.jsx";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const yearParam = searchParams.get("year") || "";
  const typeParam = searchParams.get("type") || "";
  const navigate = useNavigate();
  const pageFromUrl = Math.max(1, Number(pageParam) || 1);
  const page = pageFromUrl;
  const pageSize = 20;

  const goToPage = (nextPage) => {
    const safePage = Math.max(1, nextPage);
    const queryString = searchParams.toString();
    const query = queryString ? `?${queryString}` : "";
    navigate(`/country/${country}${safePage > 1 ? `/${safePage}` : ""}${query}`);
  };

  const { data: ophim = [], isLoading: loadingOphim } = useMoviesByCountry(
    country || "",
    {
      page,
      enabled: Boolean(country),
      year: yearParam,
      movieType: typeParam,
    }
  );
  const { data: kkphim = [], isLoading: loadingKK } = useKKphimByCountry(
    country || "",
    {
      page,
      enabled: Boolean(country),
      year: yearParam,
      movieType: typeParam,
    }
  );

  const movies = useMemo(() => {
    const map = new Map();
    [...kkphim, ...ophim].forEach((m) => {
      if (!m || !m.slug) return;
      if (!map.has(m.slug)) map.set(m.slug, m);
    });
    let result = Array.from(map.values());

    if (yearParam) {
      result = result.filter(
        (m) => m.year && String(m.year) === String(yearParam)
      );
    }

    if (typeParam) {
      result = result.filter(
        (m) => m.type && String(m.type) === String(typeParam)
      );
    }

    return result;
  }, [kkphim, ophim, yearParam, typeParam]);

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

  const handleYearChange = (value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set("year", value);
    } else {
      newParams.delete("year");
    }
    setSearchParams(newParams);
  };

  const handleTypeChange = (value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set("type", value);
    } else {
      newParams.delete("type");
    }
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6">
      <SEO title={`Danh sách phim ${heading} ${typeParam} ${yearParam}`} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-[0.14em]">
            Quốc gia
          </p>
          <h1 className="text-2xl font-bold text-white">{heading}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <CountryFilter value={country || ""} onChange={handleChange} />
          <YearFilter value={yearParam} onChange={handleYearChange} />
          <TypeFilter value={typeParam} onChange={handleTypeChange} />
        </div>
      </div>

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
        <div className="text-slate-400">Không có dữ liệu.</div>
      )}
    </div>
  );
};

export default Country;
