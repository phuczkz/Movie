import { useQuery } from "@tanstack/react-query";
import { getKKphimChieuRap } from "../api/kkphim";
import { getOphimChieuRap } from "../api/movies";

const parseEp = (epStr) => {
  if (!epStr) return 0;
  if (typeof epStr === "number") return epStr;
  const match = String(epStr).match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

const mergeChieuRap = (kkList = [], ophimList = []) => {
  const map = new Map();

  const add = (list, sourcePriority) => {
    list.forEach((movie) => {
      const slug = movie.slug || movie._id;
      if (!slug) return;
      const current = map.get(slug);

      const epCount = Math.max(
        parseEp(movie.episode_current),
        parseEp(movie.episode_total)
      );

      if (!current) {
        map.set(slug, { movie, epCount, sourcePriority });
      } else {
        // keep the one with higher episodes, or if equal, keep the one with higher priority
        if (epCount > current.epCount) {
          map.set(slug, { movie, epCount, sourcePriority });
        } else if (
          epCount === current.epCount &&
          sourcePriority > current.sourcePriority
        ) {
          map.set(slug, { movie, epCount, sourcePriority });
        }
      }
    });
  };

  // Give Ophim lower priority (1) and KKPhim higher priority (2) or vice versa
  // If we prefer KKphim, let's give it priority 2.
  add(ophimList, 1);
  add(kkList, 2);

  return Array.from(map.values()).map((item) => item.movie);
};

export const useChieuRapMerged = (page = 1, options = {}) => {
  return useQuery({
    queryKey: ["merged", "chieu-rap", page],
    queryFn: async () => {
      const [kk, op] = await Promise.all([
        getKKphimChieuRap(page).catch(() => []),
        getOphimChieuRap(page).catch(() => []),
      ]);
      return mergeChieuRap(kk, op);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};
