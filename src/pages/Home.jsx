import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Hero from "../components/Hero.jsx";
import MovieCard from "../components/MovieCard.jsx";
import Section from "../components/Section.jsx";
import GridSkeleton from "../components/GridSkeleton.jsx";
import { useMoviesList } from "../hooks/useMoviesList.js";
import { useTmdbPopular } from "../hooks/useTmdbPopular.js";
import { useKKphimMovies } from "../hooks/useKKphimMovies.js";
import LoginBanner from "../components/LoginBanner.jsx";
import TrendingSection from "../components/TrendingSection.jsx";

// Observe once per section to lazy-enable fetching and rendering
const useSectionVisibility = () => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || visible) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px", threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  return [ref, visible];
};

const Grid = ({
  items = [],
  variant = "portrait",
  className = "",
  priorityCount = 0,
}) => (
  <div className={`grid-movies ${className}`.trim()}>
    {items.map((movie, idx) => (
      <MovieCard
        key={movie.slug}
        movie={movie}
        variant={variant}
        priority={idx < priorityCount}
      />
    ))}
  </div>
);

const Home = () => {
  const commonQueryOpts = {
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false,
  };

  const [refSeries, showSeries] = useSectionVisibility();
  const [refSingle, showSingle] = useSectionVisibility();
  const [refLatest, showLatest] = useSectionVisibility();
  const [refPopular, showPopular] = useSectionVisibility();
  const [refKKSeries, showKKSeries] = useSectionVisibility();
  const [refKKSingle, showKKSingle] = useSectionVisibility();

  const { data: latest = [], isLoading: loadingLatest } = useMoviesList(
    "latest",
    undefined,
    { enabled: showLatest, ...commonQueryOpts }
  );
  const { data: series = [], isLoading: loadingSeries } = useMoviesList(
    "series",
    undefined,
    { enabled: showSeries, ...commonQueryOpts }
  );
  const { data: single = [], isLoading: loadingSingle } = useMoviesList(
    "single",
    undefined,
    { enabled: showSingle, ...commonQueryOpts }
  );
  const { data: popular = [], isLoading: loadingPopular } = useTmdbPopular(1, {
    enabled: showPopular,
    ...commonQueryOpts,
  });

  const { data: kkSeries = [], isLoading: loadingKKSeries } = useKKphimMovies(
    "series",
    { enabled: showKKSeries, ...commonQueryOpts }
  );
  const { data: kkSingle = [], isLoading: loadingKKSingle } = useKKphimMovies(
    "single",
    { enabled: showKKSingle, ...commonQueryOpts }
  );

  const heroSource = popular && popular.length >= 4 ? popular : latest;
  const heroMovies = heroSource.slice(0, 4);
  const latestHot = heroSource.slice(0, 7);
  const cap = (list) => list.slice(0, 12);

  return (
    <div className="space-y-10">
      <LoginBanner />
      
      <Hero movies={heroMovies} />

      <TrendingSection movies={kkSeries.slice(0, 10)} loading={loadingKKSeries} />

      <div ref={refKKSeries}>
        <Section
          title="Phim bộ (KKphim)"
          action={<span className="text-sm text-amber-300">KKphim</span>}
        >
          {loadingKKSeries ? (
            <GridSkeleton count={4} />
          ) : (
            <Grid items={cap(kkSeries)} priorityCount={4} />
          )}
        </Section>
      </div>

      <div ref={refKKSingle}>
        <Section
          title="Phim lẻ (KKphim)"
          action={<span className="text-sm text-amber-300">KKphim</span>}
        >
          {loadingKKSingle ? (
            <GridSkeleton count={4} />
          ) : (
            <Grid items={cap(kkSingle)} priorityCount={4} />
          )}
        </Section>
      </div>

      <div ref={refPopular}>
        <Section
          title="Phim thịnh hành (Poster)"
          action={<span className="text-sm text-emerald-300">TMDB</span>}
        >
          {loadingPopular ? (
            <GridSkeleton count={4} />
          ) : (
            <Grid items={cap(popular)} priorityCount={4} />
          )}
        </Section>
      </div>

      <div ref={refLatest}>
        <Section
          title="Phim mới cập nhật"
          action={
            <Link className="text-sm text-emerald-300" to="/category/phim-moi">
              Xem thêm
            </Link>
          }
        >
          {loadingLatest ? (
            <GridSkeleton count={4} variant="landscape" className="grid-movies-landscape" />
          ) : (
            <Grid
              items={latestHot}
              variant="landscape"
              className="grid-movies-landscape"
              priorityCount={4}
            />
          )}
        </Section>
      </div>

      <div ref={refSeries}>
        <Section
          title="Phim bộ"
          action={
            <Link className="text-sm text-emerald-300" to="/category/phim-bo">
              Xem thêm
            </Link>
          }
        >
          {loadingSeries ? (
            <GridSkeleton count={3} />
          ) : (
            <Grid items={cap(series)} priorityCount={3} />
          )}
        </Section>
      </div>

      <div ref={refSingle}>
        <Section
          title="Phim lẻ"
          action={
            <Link className="text-sm text-emerald-300" to="/category/phim-le">
              Xem thêm
            </Link>
          }
        >
          {loadingSingle ? (
            <GridSkeleton count={3} />
          ) : (
            <Grid items={cap(single)} priorityCount={3} />
          )}
        </Section>
      </div>
    </div>
  );
};

export default Home;
