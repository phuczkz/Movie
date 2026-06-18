import { useQuery } from "@tanstack/react-query";
import { getCountry } from "../api/movies";

export const useMoviesByCountry = (
  country,
  { page = 1, year = "", movieType = "", ...options } = {}
) => {
  const queryKey = ["movies", "country", country, page, year, movieType].filter(Boolean);
  const extraParams = {};
  if (year) extraParams.year = year;
  if (movieType) extraParams.type = movieType;

  return useQuery({
    queryKey,
    queryFn: () => getCountry(country, page, extraParams),
    enabled: Boolean(country),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};
