export const parseEpisodeNumber = (value) => {
  if (!value) return null;
  const match = String(value).match(/(\d+)/);
  return match ? Number(match[1]) : null;
};

const stripDiacritics = (text = "") =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const normalizeServerLabel = (name) => {
  const raw = (name || "").toString().trim();
  const plain = stripDiacritics(raw).toLowerCase();

  if (!raw) return "Vietsub";
  if (plain.includes("subteam")) return "Vietsub";
  if (plain.includes("thuyet") || plain.includes("thuy minh"))
    return "Thuyết Minh";
  if (plain.includes("long") && plain.includes("tieng")) return "Lồng Tiếng";
  if (plain.includes("viet")) return "Vietsub";
  return raw;
};

export const getLatestEpisodeNumber = (movie, episodes = []) => {
  const epCurrent = parseEpisodeNumber(movie?.episode_current);
  const latestFromList = episodes.reduce((max, ep) => {
    const n = parseEpisodeNumber(ep?.name || ep?.slug);
    return n !== null && n !== undefined ? Math.max(max, n) : max;
  }, -1);
  return Math.max(epCurrent ?? -1, latestFromList);
};

export const getEpisodeLabel = (movie, episodes = []) => {
  const latestEpisodeNumber = getLatestEpisodeNumber(movie, episodes);
  if (latestEpisodeNumber >= 0) return `Tập ${latestEpisodeNumber}`;
  if (movie?.episode_current) {
    const label = movie.episode_current.replace(/HOÀN TẤT\s*/gi, "").trim();
    if (label) return label;
  }
  if (movie?.status) return movie.status;
  return "HD";
};

/**
 * Checks if the given episode is the final episode of the movie/season.
 */
export const isLastEpisode = (episode, movie) => {
  if (!episode) return false;
  const name = (episode.name || "").toLowerCase();
  
  // Rule 1: Explicit tags
  if (name.includes("[end]") || name.includes("_end") || name.includes("tập cuối") || name.includes("hoàn tất")) {
    return true;
  }

  // Rule 2: Episode number matches total
  const epNum = parseEpisodeNumber(episode.name || episode.slug);
  const total = parseEpisodeNumber(movie?.episode_total);
  if (epNum !== null && total !== null && epNum >= total) {
    return true;
  }

  return false;
};

/**
 * Parses season/type information from a movie name.
 * e.g. "Jujutsu Kaisen (Phần 2)" -> { baseName: "Jujutsu Kaisen", type: "season", season: 2 }
 * e.g. "Jujutsu Kaisen 0: Movie" -> { baseName: "Jujutsu Kaisen", type: "movie", season: null }
 */
export const parseSeasonInfo = (name = "") => {
  if (!name) return { baseName: "", type: "series", season: null };

  const lowerName = name.toLowerCase();
  let type = "series";
  let season = null;
  let baseName = name;

  // Patterns for seasons
  const seasonPatterns = [
    /(.*?)\s*\(?\s*phần\s*(\d+)\s*\)?/i,
    /(.*?)\s*\(?\s*season\s*(\d+)\s*\)?/i,
    /(.*?)\s*\(?\s*ss\s*(\d+)\s*\)?/i,
    /(.*?)\s*\(?\s*part\s*(\d+)\s*\)?/i,
    /(.*?)\s*\(?\s*chương\s*(\d+)\s*\)?/i,
  ];

  for (const regex of seasonPatterns) {
    const match = name.match(regex);
    if (match) {
      baseName = match[1].trim().replace(/[-:]\s*$/, "").trim();
      season = parseInt(match[2], 10);
      type = "season";
      break;
    }
  }

  // If not a season, check if it's a movie
  if (type === "series") {
    const movieKeywords = ["movie", "cinema", "dien anh", "chieu rap", "ban dien anh", "dai dien anh"];
    const strippedLower = stripDiacritics(lowerName);
    
    if (movieKeywords.some(kw => strippedLower.includes(kw))) {
      type = "movie";
      // Try to extract base name by removing movie keywords
      baseName = name.replace(/[:-\s]*(movie|cinema|dien anh|chieu rap|ban dien anh|dai dien anh).*/gi, "").trim();
    }
  }

  // Final cleanup of baseName
  baseName = baseName.replace(/[:-\s]+$/, "").trim();

  return { baseName, type, season };
};
