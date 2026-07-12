import { useQuery } from "@tanstack/react-query";
import { getPopular } from '@/features/movies/api/tmdb';

export const useTmdbPopular = (page = 1, options = {}) =>
  useQuery({
    queryKey: ["tmdb", "popular", page],
    queryFn: () => getPopular(page),
    ...options,
  });
