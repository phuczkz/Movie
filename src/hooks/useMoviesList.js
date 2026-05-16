import { useQuery } from "@tanstack/react-query";
import { getCategory, getLatest, getSeries, getSingle } from "../api/movies";

const map = {
  latest: getLatest,
  series: getSeries,
  single: getSingle,
};

export const useMoviesList = (
  type = "latest",
  category,
  { page = 1, country = "", ...options } = {}
) => {
  const queryKey = ["movies", type, category, page, country].filter(Boolean);
  const extraParams = country ? { country } : {};
  const queryFn = category
    ? () => getCategory(category, page, extraParams)
    : () => (map[type] || getLatest)(page, extraParams);

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};
