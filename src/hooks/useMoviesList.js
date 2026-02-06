import { useQuery } from "@tanstack/react-query";
import { getCategory, getLatest, getSeries, getSingle } from "../api/movies";

const map = {
  latest: getLatest,
  series: getSeries,
  single: getSingle,
};

export const useMoviesList = (type = "latest", category, options = {}) => {
  const queryKey = ["movies", type, category].filter(Boolean);
  const queryFn = category
    ? () => getCategory(category)
    : map[type] || getLatest;

  return useQuery({ queryKey, queryFn, ...options });
};
