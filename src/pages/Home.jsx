import { Link } from "react-router-dom";
import Hero from "../components/Hero.jsx";
import MovieCard from "../components/MovieCard.jsx";
import Section from "../components/Section.jsx";
import { useMoviesList } from "../hooks/useMoviesList.js";
import { useTmdbPopular } from "../hooks/useTmdbPopular.js";
import { useKKphimMovies } from "../hooks/useKKphimMovies.js";

const Grid = ({ items = [] }) => (
  <div className="grid-movies">
    {items.map((movie) => (
      <MovieCard key={movie.slug} movie={movie} />
    ))}
  </div>
);

const Home = () => {
  const { data: latest = [], isLoading: loadingLatest } =
    useMoviesList("latest");
  const { data: series = [], isLoading: loadingSeries } =
    useMoviesList("series");
  const { data: single = [], isLoading: loadingSingle } =
    useMoviesList("single");
  const { data: popular = [], isLoading: loadingPopular } = useTmdbPopular();

  // KKphim
  // const { data: kkLatest = [], isLoading: loadingKKLatest } =
  //   useKKphimMovies("latest");
  const { data: kkSeries = [], isLoading: loadingKKSeries } =
    useKKphimMovies("series");
  const { data: kkSingle = [], isLoading: loadingKKSingle } =
    useKKphimMovies("single");

  const featured = latest?.[0] || popular?.[0];

  return (
    <div className="space-y-10">
      <Hero movie={featured} />

      <Section
        title="Phim bộ (KKphim)"
        action={<span className="text-sm text-amber-300">KKphim</span>}
      >
        {loadingKKSeries ? (
          <div className="text-slate-400">Đang tải...</div>
        ) : (
          <Grid items={kkSeries} />
        )}
      </Section>

      <Section
        title="Phim lẻ (KKphim)"
        action={<span className="text-sm text-amber-300">KKphim</span>}
      >
        {loadingKKSingle ? (
          <div className="text-slate-400">Đang tải...</div>
        ) : (
          <Grid items={kkSingle} />
        )}
      </Section>

      <Section
        title="Phim thịnh hành (TMDB)"
        action={<span className="text-sm text-emerald-300">TMDB</span>}
      >
        {loadingPopular ? (
          <div className="text-slate-400">Đang tải...</div>
        ) : (
          <Grid items={popular} />
        )}
      </Section>

      <Section
        title="Phim mới cập nhật"
        action={
          <Link className="text-sm text-emerald-300" to="/category/phim-moi">
            Xem thêm
          </Link>
        }
      >
        {loadingLatest ? (
          <div className="text-slate-400">Đang tải...</div>
        ) : (
          <Grid items={latest} />
        )}
      </Section>

      <Section
        title="Phim bộ"
        action={
          <Link className="text-sm text-emerald-300" to="/category/phim-bo">
            Xem thêm
          </Link>
        }
      >
        {loadingSeries ? (
          <div className="text-slate-400">Đang tải...</div>
        ) : (
          <Grid items={series} />
        )}
      </Section>

      <Section
        title="Phim lẻ"
        action={
          <Link className="text-sm text-emerald-300" to="/category/phim-le">
            Xem thêm
          </Link>
        }
      >
        {loadingSingle ? (
          <div className="text-slate-400">Đang tải...</div>
        ) : (
          <Grid items={single} />
        )}
      </Section>
    </div>
  );
};

export default Home;
