import { useQuery } from "@tanstack/react-query";
import {
  getKKphimLatest,
  getKKphimSeries,
  getKKphimSingle,
  getKKphimByCategory,
  getKKphimByCountry,
} from "../api/movies2";
import { getLatest, getSeries, getSingle, getCategory, getCountry } from "../api/movies";

const apiMap = {
  latest: getKKphimLatest,
  series: getKKphimSeries,
  single: getKKphimSingle,
};

const fallbackMap = {
  latest: getLatest,
  series: getSeries,
  single: getSingle,
};

const withFastTimeout = (promiseFn, ms = 2000) => {
  return Promise.race([
    promiseFn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Primary API Timeout")), ms))
  ]);
};

export const useKKphimMovies = (
  type = "latest",
  { page = 1, country = "", year = "", movieType = "", ...options } = {}
) => {
  const queryKey = ["kkphim", type, page, country, year, movieType].filter(Boolean);
  const extraParams = {};
  if (country) extraParams.country = country;
  if (year) extraParams.year = year;
  if (movieType) extraParams.type = movieType;
  
  const queryFn = async () => {
    try {
      const primaryFn = apiMap[type] || getKKphimLatest;
      const res = await withFastTimeout(() => primaryFn(page, extraParams));
      if (!res || res.length === 0) throw new Error("Empty from KKPhim");
      return res;
    } catch (e) {
      console.warn(`[useKKphimMovies] KKPhim failed for ${type}, falling back to Ophim`, e);
      const fallbackFn = fallbackMap[type] || getLatest;
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

export const useKKphimByCategory = (
  slug,
  { page = 1, country = "", year = "", movieType = "", ...options } = {}
) => {
  const queryKey = ["kkphim", "category", slug, page, country, year, movieType].filter(Boolean);
  const extraParams = {};
  if (country) extraParams.country = country;
  if (year) extraParams.year = year;
  if (movieType) extraParams.type = movieType;
  const queryFn = async () => {
    try {
      const res = await withFastTimeout(() => getKKphimByCategory(slug, page, extraParams));
      if (!res || res.length === 0) throw new Error("Empty from KKPhim");
      return res;
    } catch (e) {
      console.warn(`[useKKphimByCategory] KKPhim failed, falling back to Ophim`, e);
      return getCategory(slug, page, extraParams).catch(() => []);
    }
  };
  return useQuery({
    queryKey,
    queryFn,
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useKKphimByCountry = (
  slug,
  { page = 1, year = "", movieType = "", ...options } = {}
) => {
  const queryKey = ["kkphim", "country", slug, page, year, movieType].filter(Boolean);
  const extraParams = {};
  if (year) extraParams.year = year;
  if (movieType) extraParams.type = movieType;
  const queryFn = async () => {
    try {
      const res = await withFastTimeout(() => getKKphimByCountry(slug, page, extraParams));
      if (!res || res.length === 0) throw new Error("Empty from KKPhim");
      return res;
    } catch (e) {
      console.warn(`[useKKphimByCountry] KKPhim failed, falling back to Ophim`, e);
      return getCountry(slug, page, extraParams).catch(() => []);
    }
  };
  return useQuery({
    queryKey,
    queryFn,
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};
