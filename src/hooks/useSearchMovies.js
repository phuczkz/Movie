import { useQuery } from "@tanstack/react-query";
import { searchMovies } from "../api/movies";

export const useSearchMovies = (query, page = 1) =>
  useQuery({
    queryKey: ["search", query, page],
    queryFn: () => searchMovies(query, page),
    enabled: Boolean(query?.trim()),
  });
