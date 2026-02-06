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

export const useKKphimMovies = (type = "latest", options = {}) => {
  const queryKey = ["kkphim", type];
  const queryFn = apiMap[type] || getKKphimLatest;
  return useQuery({ queryKey, queryFn, staleTime: 5 * 60 * 1000, ...options });
};

export const useKKphimByCategory = (slug, options = {}) => {
  const queryKey = ["kkphim", "category", slug];
  const queryFn = () => getKKphimByCategory(slug);
  return useQuery({
    queryKey,
    queryFn,
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useKKphimByCountry = (slug, options = {}) => {
  const queryKey = ["kkphim", "country", slug];
  const queryFn = () => getKKphimByCountry(slug);
  return useQuery({
    queryKey,
    queryFn,
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
