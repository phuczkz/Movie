import { useQuery } from "@tanstack/react-query";
import { getKKphimChieuRap } from '@/features/movies/api/movies2';

export const useChieuRapMerged = (
  page = 1,
  { country = "", year = "", movieType = "", ...options } = {}
) => {
  const queryKey = ["merged", "chieu-rap", page, country, year, movieType];
  return useQuery({
    queryKey,
    queryFn: async () => {
      const extraParams = {};
      if (country) extraParams.country = country;
      if (year) extraParams.year = year;
      if (movieType) extraParams.type = movieType;

      return await getKKphimChieuRap(page, extraParams).catch(() => []);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};
