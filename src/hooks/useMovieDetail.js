import { useQuery } from "@tanstack/react-query";
import { getDetail } from "../api/movies";

export const useMovieDetail = (slug) =>
  useQuery({
    queryKey: ["movie", slug],
    queryFn: () => getDetail(slug),
    enabled: Boolean(slug),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
