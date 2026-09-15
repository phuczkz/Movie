export const FORBIDDEN_CATEGORIES = ["Phim 18+", "18+", "Cấp 3", "Sexy", "Adult"];
export const FORBIDDEN_SLUGS = ["phim-18", "18-plus", "cap-3", "adult", "sexy"];

const ADULT_SLUG_REGEX = /(^|[-_])(18-plus|phim-18|18\+|cap-3|adult|sexy)([-_]|$)/i;
const ADULT_NAME_REGEX = /(^|[\s([{-])(18\+|phim 18\+|cấp 3|adult|sexy)([\s)\]}-]|$)/i;

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
    ADULT_SLUG_REGEX.test(slug) ||
    ADULT_NAME_REGEX.test(name) ||
    slug === "phim-18" ||
    slug === "18-plus" ||
    name === "18+"
  );
};

/**
 * Checks if a movie belongs to the "Phim 18+" category or contains adult content.
 * @param {Object} movie 
 * @returns {boolean} True if the movie is 18+, false otherwise.
 */
export const isAdultMovie = (movie) => {
  if (!movie) return false;

  // Check categories
  const categories = movie.category || movie.genres || [];
  if (Array.isArray(categories)) {
    const hasAdultCategory = categories.some((cat) => {
      const name = (typeof cat === "string" ? cat : cat?.name || "").trim();
      const slug = (typeof cat === "string" ? "" : cat?.slug || "").trim();

      return (
        ADULT_NAME_REGEX.test(name) ||
        ADULT_SLUG_REGEX.test(slug) ||
        slug === "phim-18" ||
        slug === "18-plus" ||
        name === "18+"
      );
    });
    if (hasAdultCategory) return true;
  }

  // Check movie name or slug as a fallback
  const name = (movie.name || "").trim();
  const slug = (movie.slug || "").trim();
  
  if (ADULT_SLUG_REGEX.test(slug) || ADULT_NAME_REGEX.test(name)) return true;

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
