import { useMemo } from "react";
import { useSearchMovies } from "./useSearchMovies";
import { parseSeasonInfo } from "../utils/episodes";

/**
 * Hook to discover and manage seasons of a movie series.
 * Groups results by TMDB ID (primary) or baseName (fallback).
 * @param {Object} currentMovie - The current movie object
 * @returns {Object} { groups, currentSeason, nextSeason, isLoading, isSeries, baseName }
 */
export const useSeries = (currentMovie) => {
  const { baseName, season: currentSeasonNumber } = useMemo(
    () => parseSeasonInfo(currentMovie?.name || ""),
    [currentMovie?.name]
  );

  // Search with full movie name (including "Phần X") so API can match via alternative_names
  const searchQuery = currentMovie?.name || "";
  const { data: searchResults = [], isLoading } = useSearchMovies(searchQuery);

  // Extract TMDB ID of current movie for primary grouping
  const currentTmdbId = currentMovie?.tmdb?.id || currentMovie?.origin?.tmdb?.id || null;

  const groups = useMemo(() => {
    if (!baseName || !searchResults.length) return { seasons: [], movies: [], series: [] };

    const normalizedBase = baseName.toLowerCase().trim();

    // Categorize: match by TMDB ID (primary) or baseName (fallback)
    const categorized = searchResults.flatMap((m) => {
      const info = parseSeasonInfo(m.name);
      const normalizedMBase = info.baseName.toLowerCase().trim();

      const tmdbId = m.tmdb?.id || m.origin?.tmdb?.id || null;
      // Primary: same TMDB series ID
      const matchByTmdb = currentTmdbId && tmdbId && String(currentTmdbId) === String(tmdbId);
      // Fallback: baseName comparison
      const matchByName = normalizedMBase === normalizedBase ||
                          normalizedMBase.includes(normalizedBase) ||
                          normalizedBase.includes(normalizedMBase);

      if (!matchByTmdb && !matchByName) return [];

      return [{ ...m, ...info }];
    });

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

    // Deduplicate seasons by season number (keep the first one encountered)
    const uniqueSeasons = [];
    const seenSeasonNums = new Set();
    seasons.forEach(s => {
      if (!seenSeasonNums.has(s.season)) {
        seenSeasonNums.add(s.season);
        uniqueSeasons.push(s);
      }
    });

    // If no "Phần X" patterns found but all results share same TMDB ID,
    // promote them as seasons using tmdb.season field
    let finalSeasons = uniqueSeasons;
    if (uniqueSeasons.length === 0 && currentTmdbId) {
      const tmdbGrouped = unique
        .filter((m) => {
          const tmdbId = m.tmdb?.id || m.origin?.tmdb?.id || null;
          return tmdbId && String(currentTmdbId) === String(tmdbId);
        })
        .sort((a, b) => (a.tmdb?.season || a.year || 0) - (b.tmdb?.season || b.year || 0));

      if (tmdbGrouped.length >= 2) {
        const mapped = tmdbGrouped.map((m, idx) => ({
          ...m,
          type: "season",
          season: m.tmdb?.season || idx + 1,
        }));
        const seen2 = new Set();
        finalSeasons = mapped.filter(s => {
          if (seen2.has(s.season)) return false;
          seen2.add(s.season);
          return true;
        });
      }
    }

    const movies = unique.filter((m) => m.type === "movie");
    const series = unique.filter((m) => m.type === "series" && m.slug !== currentMovie?.slug);

    // Inject the current movie into seasons if its season number is not already in the list
    // (API search may not return the current movie itself)
    if (currentMovie && currentSeasonNumber !== null && finalSeasons.length > 0) {
      const alreadyIncluded = finalSeasons.some(s => s.season === currentSeasonNumber);
      if (!alreadyIncluded) {
        const currentEntry = {
          ...currentMovie,
          type: "season",
          season: currentSeasonNumber,
          baseName,
        };
        finalSeasons = [...finalSeasons, currentEntry].sort((a, b) => a.season - b.season);
      }
    }

    return { seasons: finalSeasons, movies, series };
  }, [baseName, searchResults, currentMovie?.slug, currentTmdbId]);

  const nextSeason = useMemo(() => {
    if (currentSeasonNumber === null) return null;
    return groups.seasons.find((s) => s.season === currentSeasonNumber + 1) || null;
  }, [groups.seasons, currentSeasonNumber]);

  // isSeries = true if there are at least 2 season entries, or spinoffs/related series exist
  const isSeries = groups.seasons.length >= 2 || groups.movies.length > 0 || groups.series.length > 0;

  return {
    groups,
    currentSeason: currentSeasonNumber,
    nextSeason,
    isLoading,
    isSeries,
    baseName,
  };
};
