import { useQuery } from "@tanstack/react-query";
import {
  getKKphimLatest,
  getKKphimSeries,
  getKKphimSingle,
  getKKphimByCategory,
  getKKphimByCountry,
} from '@/features/movies/api/movies2';

const apiMap = {
  latest: getKKphimLatest,
  series: getKKphimSeries,
  single: getKKphimSingle,
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
    const fn = apiMap[type] || getKKphimLatest;
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
    return getKKphimByCategory(slug, page, extraParams).catch(() => []);
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
    return getKKphimByCountry(slug, page, extraParams).catch(() => []);
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
