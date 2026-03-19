import MovieCardSkeleton from "./MovieCardSkeleton.jsx";

export default function GridSkeleton({ count = 4, className = "", variant = "portrait" }) {
  return (
    <div className={`grid-movies ${className}`.trim()}>
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
}
