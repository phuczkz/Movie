export const FORBIDDEN_CATEGORIES = ["Phim 18+", "18+", "Cấp 3", "Sexy", "Adult"];
export const FORBIDDEN_SLUGS = ["phim-18", "18-plus", "cap-3", "adult", "sexy", "18"];

/**
 * Checks if a genre or slug belongs to forbidden 18+ categories.
 * @param {string|Object} genreOrSlug 
 * @returns {boolean}
 */
export const isForbiddenGenre = (genreOrSlug) => {
  if (!genreOrSlug) return false;
  const name = (typeof genreOrSlug === "string" ? genreOrSlug : genreOrSlug?.name || "").toLowerCase().trim();
  const slug = (typeof genreOrSlug === "string" ? genreOrSlug : genreOrSlug?.slug || "").toLowerCase().trim();

  return (
    FORBIDDEN_SLUGS.some((f) => slug === f || slug.includes(f)) ||
    FORBIDDEN_CATEGORIES.some((f) => name.includes(f.toLowerCase())) ||
    slug === "phim-18" ||
    slug.includes("18") ||
    name.includes("18+")
  );
};

/**
 * Checks if a movie belongs to the "Phim 18+" category or contains adult content.
 * @param {Object} movie 
 * @returns {boolean} True if the movie is 18+, false otherwise.
 */
export const isAdultMovie = (movie) => {
  if (!movie) return false;

  const forbiddenCategories = FORBIDDEN_CATEGORIES;
  const forbiddenSlugs = FORBIDDEN_SLUGS;

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
  
  if (forbiddenSlugs.some(f => slug.includes(f)) || forbiddenCategories.some(f => name.includes(f.toLowerCase()))) return true;

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
