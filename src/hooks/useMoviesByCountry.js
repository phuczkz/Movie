import { useQuery } from "@tanstack/react-query";
import { getCountry } from "../api/movies";

export const useMoviesByCountry = (country, { page = 1, ...options } = {}) =>
  useQuery({
    queryKey: ["movies", "country", country, page],
    queryFn: () => getCountry(country, page),
    enabled: Boolean(country),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
