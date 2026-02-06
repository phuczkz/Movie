import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CountryFilter from "../components/CountryFilter.jsx";
import MovieCard from "../components/MovieCard.jsx";
import { useMoviesByCountry } from "../hooks/useMoviesByCountry.js";

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
  const { country } = useParams();
  const navigate = useNavigate();

  const { data: movies = [], isLoading } = useMoviesByCountry(country || "");

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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {movies.map((movie) => (
            <MovieCard key={movie.slug} movie={movie} />
          ))}
        </div>
      ) : (
        <div className="text-slate-400">Không có dữ liệu.</div>
      )}
    </div>
  );
};

export default Country;
