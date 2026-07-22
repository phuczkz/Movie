import { useMemo } from "react";
import { useSearchMovies } from "./useSearchMovies";
import { parseSeasonInfo } from '@/utils/episodes';

const getRootTitle = (title = "") => {
  if (!title) return "";
  let clean = title.replace(/\s*\([^)]*\)/g, "").trim();
  clean = clean.split(/[:(]/)[0].trim();
  clean = clean.replace(/\s+[-–—]\s+.*$/, "").trim();
  clean = clean.replace(/[-–—:]\s*$/, "").trim();
  return clean;
};

/**
 * Hook to discover and manage seasons of a movie series.
 * Groups results by TMDB ID (primary) or baseName/rootTitle (fallback).
 * @param {Object} currentMovie - The current movie object
 * @returns {Object} { groups, currentSeason, nextSeason, isLoading, isSeries, baseName }
 */
export const useSeries = (currentMovie) => {
  const originInfo = useMemo(
    () => parseSeasonInfo(currentMovie?.origin_name || ""),
    [currentMovie?.origin_name]
  );
  const nameInfo = useMemo(
    () => parseSeasonInfo(currentMovie?.name || ""),
    [currentMovie?.name]
  );

  const baseName = originInfo.baseName || nameInfo.baseName || "";

  const originRoot = useMemo(
    () => getRootTitle(originInfo.baseName || currentMovie?.origin_name || ""),
    [originInfo.baseName, currentMovie?.origin_name]
  );
  const nameRoot = useMemo(
    () => getRootTitle(nameInfo.baseName || currentMovie?.name || ""),
    [nameInfo.baseName, currentMovie?.name]
  );

  // Determine current movie's season number
  let currentSeasonNumber =
    originInfo.season !== null
      ? originInfo.season
      : nameInfo.season !== null
      ? nameInfo.season
      : currentMovie?.tmdb?.season || null;

  // Search query: Use root title of origin_name first (e.g. "Blue Lock"), fallback to nameRoot or name
  const searchQuery = originRoot || nameRoot || currentMovie?.origin_name || currentMovie?.name || "";
  const { data: searchResults = [], isLoading } = useSearchMovies(searchQuery);

  // Extract TMDB ID of current movie for primary grouping
  const currentTmdbId = currentMovie?.tmdb?.id || currentMovie?.origin?.tmdb?.id || null;

  const groups = useMemo(() => {
    if ((!baseName && !currentMovie?.name) || !searchResults.length) {
      return { seasons: [] };
    }

    const normOriginRoot = originRoot.toLowerCase().trim();
    const normNameRoot = nameRoot.toLowerCase().trim();

    // Categorize: match by TMDB ID (primary), origin root, or name root
    const categorized = searchResults.flatMap((m) => {
      const mOriginInfo = parseSeasonInfo(m.origin_name || "");
      const mNameInfo = parseSeasonInfo(m.name || "");

      const mOriginRoot = getRootTitle(mOriginInfo.baseName || m.origin_name).toLowerCase().trim();
      const mNameRoot = getRootTitle(mNameInfo.baseName || m.name).toLowerCase().trim();

      const tmdbId = m.tmdb?.id || m.origin?.tmdb?.id || null;
      // Primary: same TMDB series ID
      const matchByTmdb = currentTmdbId && tmdbId && String(currentTmdbId) === String(tmdbId);

      // Match by origin root title
      const matchByOrigin =
        normOriginRoot &&
        mOriginRoot &&
        (mOriginRoot === normOriginRoot ||
          mOriginRoot.includes(normOriginRoot) ||
          normOriginRoot.includes(mOriginRoot));

      // Match by name root title
      const matchByName =
        normNameRoot &&
        mNameRoot &&
        (mNameRoot === normNameRoot ||
          mNameRoot.includes(normNameRoot) ||
          normNameRoot.includes(mNameRoot));

      if (!matchByTmdb && !matchByOrigin && !matchByName) return [];

      const season =
        mOriginInfo.season !== null
          ? mOriginInfo.season
          : mNameInfo.season !== null
          ? mNameInfo.season
          : m.tmdb?.season || null;

      const type =
        mOriginInfo.type && mOriginInfo.type !== "series"
          ? mOriginInfo.type
          : mNameInfo.type || "series";

      return [{
        ...m,
        baseName: mOriginInfo.baseName || mNameInfo.baseName,
        type: season !== null ? "season" : type,
        season,
      }];
    });

    // Deduplicate by slug
    const seenSlugs = new Set();
    const unique = categorized.filter((m) => {
      if (seenSlugs.has(m.slug)) return false;
      seenSlugs.add(m.slug);
      return true;
    });

    let seasons = unique.filter((m) => m.type === "season" && m.season !== null);
    const seriesItems = unique.filter((m) => m.type === "series" || m.season === null);

    // If explicit seasons exist (e.g. Season 2) and unnumbered series exist, promote unnumbered to Season 1
    if (seasons.length > 0 && seriesItems.length > 0) {
      const hasSeason1 = seasons.some((s) => s.season === 1);
      if (!hasSeason1) {
        seriesItems.forEach((item) => {
          seasons.push({ ...item, type: "season", season: 1 });
        });
      }
    }
    // If no explicit season numbers exist at all, but 2+ series items share the same root title,
    // promote all series items to seasons based on release year / order!
    else if (seasons.length === 0 && seriesItems.length >= 2) {
      const sorted = [...seriesItems].sort((a, b) => (a.year || 0) - (b.year || 0));
      seasons = sorted.map((m, idx) => ({
        ...m,
        type: "season",
        season: idx + 1,
      }));
    }

    // Sort seasons by season number
    seasons.sort((a, b) => (a.season || 0) - (b.season || 0));

    // Deduplicate seasons by season number
    const uniqueSeasons = [];
    const seenSeasonNums = new Set();
    seasons.forEach((s) => {
      if (s.season !== null && !seenSeasonNums.has(s.season)) {
        seenSeasonNums.add(s.season);
        uniqueSeasons.push(s);
      }
    });

    let finalSeasons = uniqueSeasons;

    // TMDB fallback if no explicit seasons found
    if (finalSeasons.length === 0 && currentTmdbId) {
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
        finalSeasons = mapped.filter((s) => {
          if (seen2.has(s.season)) return false;
          seen2.add(s.season);
          return true;
        });
      }
    }

    // Inject currentMovie into finalSeasons if missing
    if (currentMovie && currentSeasonNumber !== null && finalSeasons.length > 0) {
      const alreadyIncluded = finalSeasons.some(
        (s) => s.season === currentSeasonNumber || s.slug === currentMovie.slug
      );
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

    return { seasons: finalSeasons };
  }, [baseName, searchResults, currentMovie, currentTmdbId, currentSeasonNumber, originRoot, nameRoot]);

  // Infer currentSeasonNumber if it was null but currentMovie ended up in finalSeasons
  let finalSeasonNumber = currentSeasonNumber;
  if (finalSeasonNumber === null && currentMovie?.slug && groups.seasons.length > 0) {
    const foundInSeasons = groups.seasons.find((s) => s.slug === currentMovie.slug);
    if (foundInSeasons) {
      finalSeasonNumber = foundInSeasons.season;
    }
  }

  const nextSeason =
    groups.seasons.find(
      (s) => finalSeasonNumber !== null && s.season === finalSeasonNumber + 1
    ) || null;

  const isSeries = groups.seasons.length >= 1;

  return {
    groups,
    currentSeason: finalSeasonNumber,
    nextSeason,
    isLoading,
    isSeries,
    baseName,
  };
};
