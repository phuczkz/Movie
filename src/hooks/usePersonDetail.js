import { useQuery } from "@tanstack/react-query";
import { getTmdbPersonDetail, getTmdbPersonCredits, searchTmdbPerson } from "../api/tmdb";

export const usePersonDetail = (idOrName) =>
  useQuery({
    queryKey: ["person", idOrName],
    queryFn: async () => {
      let personId = idOrName;

      // If idOrName is not a number, it's likely a name, so search for the TMDB ID first
      if (isNaN(Number(idOrName))) {
        const searchResult = await searchTmdbPerson(idOrName);
        if (searchResult) {
          personId = searchResult.id;
        } else {
          return null;
        }
      }

      const [detail, credits] = await Promise.all([
        getTmdbPersonDetail(personId),
        getTmdbPersonCredits(personId),
      ]);
      return { ...detail, credits };
    },
    enabled: Boolean(idOrName),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
  });
