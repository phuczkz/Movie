import { useMemo } from "react";
import { useSearchMovies } from "./useSearchMovies";
import { parseSeasonInfo } from "../utils/episodes";

/**
 * Hook to discover and manage seasons of a movie series.
 * @param {Object} currentMovie - The current movie object
 * @returns {Object} { allSeasons, currentSeason, nextSeason, isLoading, isSeries }
 */
export const useSeries = (currentMovie) => {
  const { baseName, season: currentSeasonNumber } = useMemo(
    () => parseSeasonInfo(currentMovie?.name || ""),
    [currentMovie?.name]
  );

  // Search for the base name to find other seasons
  const { data: searchResults = [], isLoading } = useSearchMovies(baseName);

  const groups = useMemo(() => {
    if (!baseName || !searchResults.length) return { seasons: [], movies: [], series: [] };

    const normalizedBase = baseName.toLowerCase().trim();
    
    // Categorize
    const categorized = searchResults.map((m) => {
      const info = parseSeasonInfo(m.name);
      const normalizedMBase = info.baseName.toLowerCase().trim();
      
      const isMatch = normalizedMBase === normalizedBase || 
                      normalizedMBase.includes(normalizedBase) || 
                      normalizedBase.includes(normalizedMBase);
      
      if (!isMatch) return null;

      return {
        ...m,
        ...info,
      };
    }).filter(Boolean);

    // Deduplicate by slug
    const seenSlugs = new Set();
    const unique = categorized.filter((m) => {
      if (seenSlugs.has(m.slug)) return false;
      seenSlugs.add(m.slug);
      return true;
    });

    const seasons = unique
      .filter((m) => m.type === "season")
      .sort((a, b) => a.season - b.season);
    
    const movies = unique.filter((m) => m.type === "movie");
    const series = unique.filter((m) => m.type === "series" && m.slug !== currentMovie?.slug);

    return { seasons, movies, series };
  }, [baseName, searchResults, currentMovie?.slug]);

  const nextSeason = useMemo(() => {
    if (currentSeasonNumber === null) return null;
    return groups.seasons.find((s) => s.season === currentSeasonNumber + 1) || null;
  }, [groups.seasons, currentSeasonNumber]);

  return {
    groups,
    currentSeason: currentSeasonNumber,
    nextSeason,
    isLoading,
    isSeries: (groups.seasons.length + groups.movies.length + groups.series.length) > 1,
    baseName,
  };
};
