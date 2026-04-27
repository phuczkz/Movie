/**
 * Checks if a movie belongs to the "Phim 18+" category or contains adult content.
 * @param {Object} movie 
 * @returns {boolean} True if the movie is 18+, false otherwise.
 */
export const isAdultMovie = (movie) => {
  if (!movie) return false;

  const forbiddenCategories = ["Phim 18+", "18+", "Cấp 3", "Sexy", "Adult"];
  const forbiddenSlugs = ["phim-18", "18-plus", "cap-3", "adult", "sexy"];

  // Check categories
  const categories = movie.category || movie.genres || [];
  if (Array.isArray(categories)) {
    const hasAdultCategory = categories.some((cat) => {
      const name = (typeof cat === "string" ? cat : cat?.name || "").trim();
      const slug = (typeof cat === "string" ? "" : cat?.slug || "").trim();

      return (
        forbiddenCategories.some((forbidden) => name.toLowerCase().includes(forbidden.toLowerCase())) ||
        forbiddenSlugs.some((forbidden) => slug.toLowerCase().includes(forbidden.toLowerCase()))
      );
    });
    if (hasAdultCategory) return true;
  }

  // Check movie name or slug as a fallback
  const name = (movie.name || "").toLowerCase();
  const slug = (movie.slug || "").toLowerCase();
  
  if (forbiddenSlugs.some(f => slug.includes(f))) return true;

  return false;
};

/**
 * Filter a list of movies to remove 18+ content.
 * @param {Array} movies 
 * @returns {Array} Filtered list.
 */
export const filterAdultMovies = (movies) => {
  if (!Array.isArray(movies)) return [];
  return movies.filter(movie => !isAdultMovie(movie));
};
