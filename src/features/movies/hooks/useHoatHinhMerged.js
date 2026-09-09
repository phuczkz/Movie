import { useQuery } from "@tanstack/react-query";
import { getKKphimHoatHinh } from '@/features/movies/api/movies2';
import { isForbiddenGenre } from '@/utils/filter';

export const useHoatHinhMerged = (page = 1, options = {}) => {
  const { country = "", year = "", movieType = "", category = "", genre = "", enabled, ...queryOptions } = options;
  const catParam = category || genre;
  const isBlocked = catParam && isForbiddenGenre(catParam);
  return useQuery({
    queryKey: ["hoat-hinh-merged", page, country, year, movieType, catParam].filter(Boolean),
    queryFn: async () => {
      if (isBlocked) return [];
      const extraParams = {};
      if (country) extraParams.country = country;
      if (year) extraParams.year = year;
      if (movieType) extraParams.type = movieType;
      if (catParam) extraParams.category = catParam;
      
      return await getKKphimHoatHinh(page, extraParams).catch(() => []);
    },
    enabled: !isBlocked && (enabled !== undefined ? enabled : true),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...queryOptions,
  });
};
