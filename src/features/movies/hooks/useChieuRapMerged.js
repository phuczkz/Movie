import { useQuery } from "@tanstack/react-query";
import { getKKphimChieuRap } from '@/features/movies/api/movies2';
import { isForbiddenGenre } from '@/utils/filter';

export const useChieuRapMerged = (
  page = 1,
  { country = "", year = "", movieType = "", category = "", genre = "", enabled, ...options } = {}
) => {
  const catParam = category || genre;
  const isBlocked = catParam && isForbiddenGenre(catParam);
  const queryKey = ["merged", "chieu-rap", page, country, year, movieType, catParam].filter(Boolean);
  return useQuery({
    queryKey,
    queryFn: async () => {
      if (isBlocked) return [];
      const extraParams = {};
      if (country) extraParams.country = country;
      if (year) extraParams.year = year;
      if (movieType) extraParams.type = movieType;
      if (catParam) extraParams.category = catParam;

      return await getKKphimChieuRap(page, extraParams).catch(() => []);
    },
    enabled: !isBlocked && (enabled !== undefined ? enabled : true),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};
