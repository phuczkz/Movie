import { useQuery } from "@tanstack/react-query";
import {
  getKKphimLatest,
  getKKphimSeries,
  getKKphimSingle,
  getKKphimByCategory,
  getKKphimByCountry,
  getKKphimGenres,
  getKKphimCountries,
  getKKphimYears,
} from '@/features/movies/api/movies2';
import { isForbiddenGenre } from '@/utils/filter';

const apiMap = {
  latest: getKKphimLatest,
  series: getKKphimSeries,
  single: getKKphimSingle,
};

export const useKKphimMovies = (
  type = "latest",
  { page = 1, country = "", year = "", movieType = "", category = "", genre = "", enabled, ...options } = {}
) => {
  const catParam = category || genre;
  const isBlocked = catParam && isForbiddenGenre(catParam);
  const queryKey = ["kkphim", type, page, country, year, movieType, catParam].filter(Boolean);
  const extraParams = {};
  if (country) extraParams.country = country;
  if (year) extraParams.year = year;
  if (movieType) extraParams.type = movieType;
  if (catParam) extraParams.category = catParam;
  
  const queryFn = async () => {
    if (isBlocked) return [];
    const fn = apiMap[type] || getKKphimLatest;
    return fn(page, extraParams).catch(() => []);
  };
  return useQuery({
    queryKey,
    queryFn,
    enabled: !isBlocked && (enabled !== undefined ? enabled : true),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useKKphimByCategory = (
  slug,
  { page = 1, country = "", year = "", movieType = "", enabled, ...options } = {}
) => {
  const isBlocked = !slug || isForbiddenGenre(slug);
  const queryKey = ["kkphim", "category", slug, page, country, year, movieType].filter(Boolean);
  const extraParams = {};
  if (country) extraParams.country = country;
  if (year) extraParams.year = year;
  if (movieType) extraParams.type = movieType;
  const queryFn = async () => {
    if (isBlocked) return [];
    return getKKphimByCategory(slug, page, extraParams).catch(() => []);
  };
  return useQuery({
    queryKey,
    queryFn,
    enabled: !isBlocked && (enabled !== undefined ? enabled : true),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useKKphimByCountry = (
  slug,
  { page = 1, year = "", movieType = "", category = "", genre = "", enabled, ...options } = {}
) => {
  const catParam = category || genre;
  const isBlocked = catParam && isForbiddenGenre(catParam);
  const queryKey = ["kkphim", "country", slug, page, year, movieType, catParam].filter(Boolean);
  const extraParams = {};
  if (year) extraParams.year = year;
  if (movieType) extraParams.type = movieType;
  if (catParam) extraParams.category = catParam;
  const queryFn = async () => {
    if (isBlocked) return [];
    return getKKphimByCountry(slug, page, extraParams).catch(() => []);
  };
  return useQuery({
    queryKey,
    queryFn,
    enabled: !!slug && !isBlocked && (enabled !== undefined ? enabled : true),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useMovieGenres = (options = {}) => {
  return useQuery({
    queryKey: ["kkphim", "genres"],
    queryFn: getKKphimGenres,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useMovieCountries = (options = {}) => {
  return useQuery({
    queryKey: ["kkphim", "countries"],
    queryFn: getKKphimCountries,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useMovieYears = (options = {}) => {
  return useQuery({
    queryKey: ["kkphim", "years"],
    queryFn: getKKphimYears,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};
