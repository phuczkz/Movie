import { Link } from "react-router-dom";

const MovieCard = ({ movie }) => {
  return (
    <Link
      to={`/movie/${movie.slug}`}
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 shadow-lg transition hover:-translate-y-1 hover:shadow-emerald-500/20"
    >
      <div className="aspect-[2/3] w-full overflow-hidden bg-slate-800">
        <img
          src={movie.poster_url}
          alt={movie.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 shadow">
          {movie.episode_current || "HD"}
        </span>
      </div>
      <div className="p-3 space-y-1">
        <h3 className="text-sm font-semibold text-white line-clamp-2">
          {movie.name}
        </h3>
        <p className="text-xs text-slate-400">{movie.year || "N/A"}</p>
      </div>
    </Link>
  );
};

export default MovieCard;
