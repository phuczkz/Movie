import { useQuery } from "@tanstack/react-query";
import {
  getKKphimLatest,
  getKKphimSeries,
  getKKphimSingle,
  getKKphimByCategory,
} from "@/features/movies/api/movies2";

const map = {
  latest: getKKphimLatest,
  series: getKKphimSeries,
  single: getKKphimSingle,
};

export const useMoviesList = (
  type = "latest",
  category,
  { page = 1, country = "", year = "", movieType = "", ...options } = {}
) => {
  const queryKey = [
    "movies",
    type,
    category,
    page,
    country,
    year,
    movieType,
  ].filter(Boolean);
  const extraParams = {};
  if (country) extraParams.country = country;
  if (year) extraParams.year = year;
  if (movieType) extraParams.type = movieType;

  const queryFn = async () => {
    if (category) {
      return getKKphimByCategory(category, page, extraParams).catch(() => []);
    }
    const fn = map[type] || getKKphimLatest;
    return fn(page, extraParams).catch(() => []);
  };

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};
