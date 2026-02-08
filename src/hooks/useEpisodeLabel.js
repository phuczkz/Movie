import { useQuery } from "@tanstack/react-query";
import { getDetail } from "../api/movies";
import { getEpisodeLabel } from "../utils/episodes.js";

// Derives an episode label from list data, then upgrades it with detail data when available.
export const useEpisodeLabel = (movie) => {
  const slug = movie?.slug;
  const baseLabel = getEpisodeLabel(movie);

  const { data } = useQuery({
    queryKey: ["episode-label", slug],
    queryFn: () => getDetail(slug),
    enabled: Boolean(slug) && !slug.startsWith("tmdb-"),
    staleTime: 5 * 60 * 1000,
  });

  const detailLabel = data ? getEpisodeLabel(data.movie, data.episodes) : null;
  return detailLabel || baseLabel;
};
