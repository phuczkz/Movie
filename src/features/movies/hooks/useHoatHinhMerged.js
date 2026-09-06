import { useQuery } from "@tanstack/react-query";
import { getKKphimHoatHinh } from '@/features/movies/api/movies2';

export const useHoatHinhMerged = (page = 1, options = {}) => {
  const { country = "", year = "", movieType = "", ...queryOptions } = options;
  return useQuery({
    queryKey: ["hoat-hinh-merged", page, country, year, movieType],
    queryFn: async () => {
      const extraParams = {};
      if (country) extraParams.country = country;
      if (year) extraParams.year = year;
      if (movieType) extraParams.type = movieType;
      
      return await getKKphimHoatHinh(page, extraParams).catch(() => []);
    },
    ...queryOptions,
  });
};
