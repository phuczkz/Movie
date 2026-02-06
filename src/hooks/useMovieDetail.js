import { useQuery } from "@tanstack/react-query";
import { getDetail } from "../api/movies";

export const useMovieDetail = (slug) =>
  useQuery({
    queryKey: ["movie", slug],
    queryFn: () => getDetail(slug),
    enabled: Boolean(slug),
  });
