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
  { page = 1, country = "", ...options } = {}
) => {
  const queryKey = ["kkphim", type, page, country].filter(Boolean);
  const extraParams = country ? { country } : {};
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
  { page = 1, country = "", ...options } = {}
) => {
  const queryKey = ["kkphim", "category", slug, page, country].filter(Boolean);
  const extraParams = country ? { country } : {};
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

export const useKKphimByCountry = (slug, { page = 1, ...options } = {}) => {
  const queryKey = ["kkphim", "country", slug, page];
  const queryFn = () => getKKphimByCountry(slug, page);
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
