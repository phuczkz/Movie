import { useQuery } from "@tanstack/react-query";
import {
  getKKphimLatest,
  getKKphimSeries,
  getKKphimSingle,
  getKKphimByCategory,
  getKKphimByCountry,
} from "../api/kkphim";

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
  const queryFn = () => (apiMap[type] || getKKphimLatest)(page, extraParams);
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
  const queryFn = () => getKKphimByCategory(slug, page, extraParams);
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
  const queryFn = () => getKKphimByCountry(slug, page, extraParams);
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
