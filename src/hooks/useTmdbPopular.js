import { useQuery } from "@tanstack/react-query";
import { getPopular } from "../api/tmdb";

export const useTmdbPopular = (page = 1) =>
  useQuery({
    queryKey: ["tmdb", "popular", page],
    queryFn: () => getPopular(page),
  });
