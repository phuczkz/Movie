import { useQuery } from "@tanstack/react-query";
import { searchMovies } from "../api/movies";
import { searchKKphim } from "../api/kkphim";

export const useSearchMovies = (query, page = 1) =>
  useQuery({
    queryKey: ["search", query, page],
    queryFn: async () => {
      const [kkResults, ophimResults] = await Promise.all([
        searchKKphim(query, page),
        searchMovies(query, page),
      ]);
      return [...kkResults, ...ophimResults];
    },
    enabled: Boolean(query?.trim()),
  });
