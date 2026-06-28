import { useQuery } from "@tanstack/react-query";
import { getCategory, getLatest, getSeries, getSingle } from "../api/movies";
import { getKKphimLatest, getKKphimSeries, getKKphimSingle, getKKphimByCategory } from "../api/movies2";

const map = {
  latest: getLatest,
  series: getSeries,
  single: getSingle,
};

const fallbackMap = {
  latest: getKKphimLatest,
  series: getKKphimSeries,
  single: getKKphimSingle,
};

const withFastTimeout = (promiseFn, ms = 2000) => {
  return Promise.race([
    promiseFn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Primary API Timeout")), ms))
  ]);
};

export const useMoviesList = (
  type = "latest",
  category,
  { page = 1, country = "", year = "", movieType = "", ...options } = {}
) => {
  const queryKey = ["movies", type, category, page, country, year, movieType].filter(Boolean);
  const extraParams = {};
  if (country) extraParams.country = country;
  if (year) extraParams.year = year;
  if (movieType) extraParams.type = movieType;

  const queryFn = async () => {
    try {
      if (category) {
        const res = await withFastTimeout(() => getCategory(category, page, extraParams));
        if (!res || res.length === 0) throw new Error("Empty from Ophim");
        return res;
      }
      const primaryFn = map[type] || getLatest;
      const res = await withFastTimeout(() => primaryFn(page, extraParams));
      if (!res || res.length === 0) throw new Error("Empty from Ophim");
      return res;
    } catch (e) {
      console.warn(`[useMoviesList] Ophim failed, falling back to KKPhim`, e);
      if (category) {
        return getKKphimByCategory(category, page, extraParams).catch(() => []);
      }
      const fallbackFn = fallbackMap[type] || getKKphimLatest;
      return fallbackFn(page, extraParams).catch(() => []);
    }
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
