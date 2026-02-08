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
  { page = 1, ...options } = {}
) => {
  const queryKey = ["movies", type, category, page].filter(Boolean);
  const queryFn = category
    ? () => getCategory(category, page)
    : () => (map[type] || getLatest)(page);

  return useQuery({ queryKey, queryFn, ...options });
};
