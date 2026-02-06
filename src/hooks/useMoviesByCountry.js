import { useQuery } from "@tanstack/react-query";
import { getCountry } from "../api/movies";

export const useMoviesByCountry = (country) =>
  useQuery({
    queryKey: ["movies", "country", country],
    queryFn: () => getCountry(country),
    enabled: Boolean(country),
  });
