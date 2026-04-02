import MovieCardSkeleton from "./MovieCardSkeleton.jsx";

export default function GridSkeleton({
  count = 4,
  className = "",
  variant = "portrait",
  baseClass = "grid-movies",
}) {
  return (
    <div className={`${baseClass} ${className}`.trim()}>
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
}
