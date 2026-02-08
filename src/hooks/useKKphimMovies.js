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
  { page = 1, ...options } = {}
) => {
  const queryKey = ["kkphim", type, page];
  const queryFn = () => (apiMap[type] || getKKphimLatest)(page);
  return useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useKKphimByCategory = (slug, { page = 1, ...options } = {}) => {
  const queryKey = ["kkphim", "category", slug, page];
  const queryFn = () => getKKphimByCategory(slug, page);
  return useQuery({
    queryKey,
    queryFn,
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
