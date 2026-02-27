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
  if (plain.includes("thuyet") || plain.includes("thuy minh"))
    return "Thuyết Minh";
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
  if (movie?.episode_current) return movie.episode_current;
  if (movie?.status) return movie.status;
  return "HD";
};
