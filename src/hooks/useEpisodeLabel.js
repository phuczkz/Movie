import { getEpisodeLabel } from "../utils/episodes.js";

// Lightweight: only uses list data; avoids extra detail fetch per card.
export const useEpisodeLabel = (movie) => getEpisodeLabel(movie);
