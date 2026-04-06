import { useQuery } from "@tanstack/react-query";
import { getTmdbPersonDetail, searchTmdbPerson } from "../api/tmdb";

const tmdbApiKey = import.meta.env.VITE_TMDB_API_KEY;
const tmdbProfileBase = import.meta.env.VITE_TMDB_PROFILE_BASE || "";

const normalizeNameKey = (name) => (name || "").toString().trim().toLowerCase();

const normalizeImageUrl = (value) => {
  if (!value) return null;
  const url = String(value).trim();
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/") && tmdbProfileBase) return `${tmdbProfileBase}${url}`;
  return url;
};

const isNumericId = (value) => {
  if (value === null || value === undefined) return false;
  const num = Number(value);
  return Number.isFinite(num) && String(value).trim() !== "";
};

const runWithConcurrency = async (tasks, concurrency) => {
  const queue = tasks.slice();
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length) {
      const task = queue.shift();
      if (!task) return;
      await task();
    }
  });
  await Promise.all(workers);
};

export const useActorsWithTmdbImages = (actors = [], options = {}) => {
  const enabled = options.enabled ?? true;

  return useQuery({
    queryKey: [
      "tmdb-actor-images",
      actors
        .map((a) =>
          a?.id ? `id:${a.id}` : `name:${normalizeNameKey(a?.name)}`
        )
        .join("|"),
    ],
    enabled:
      enabled &&
      Boolean(tmdbApiKey) &&
      Array.isArray(actors) &&
      actors.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    queryFn: async () => {
      const base = (Array.isArray(actors) ? actors : []).map((actor) => ({
        ...actor,
        image: normalizeImageUrl(actor?.image),
      }));

      const missing = base.filter((actor) =>
        actor?.name ? !actor.image : false
      );

      if (missing.length === 0) return base;

      const resolvedById = new Map();
      const resolvedByName = new Map();

      const tasks = [];
      const seenName = new Set();
      const seenId = new Set();

      for (const actor of missing) {
        const nameKey = normalizeNameKey(actor?.name);
        if (!nameKey) continue;

        const actorId = actor?.id;
        if (isNumericId(actorId)) {
          const idKey = String(actorId).trim();
          if (seenId.has(idKey)) continue;
          seenId.add(idKey);

          tasks.push(async () => {
            try {
              const detail = await getTmdbPersonDetail(actorId);
              const image = normalizeImageUrl(detail?.profile_path);
              if (image)
                resolvedById.set(idKey, { id: detail?.id || actorId, image });
            } catch {
              // Ignore individual failures
            }
          });

          continue;
        }

        if (seenName.has(nameKey)) continue;
        seenName.add(nameKey);

        tasks.push(async () => {
          try {
            const found = await searchTmdbPerson(actor?.name);
            const image = normalizeImageUrl(found?.profile_path);
            if (image || found?.id) {
              resolvedByName.set(nameKey, {
                id: found?.id || null,
                image: image || null,
              });
            }
          } catch {
            // Ignore individual failures
          }
        });
      }

      // Keep TMDB requests under control.
      await runWithConcurrency(tasks, 4);

      return base.map((actor) => {
        if (!actor?.name) return actor;
        if (actor.image) return actor;

        const idKey = isNumericId(actor?.id) ? String(actor.id).trim() : null;
        const nameKey = normalizeNameKey(actor.name);

        const hit =
          (idKey && resolvedById.get(idKey)) ||
          (nameKey && resolvedByName.get(nameKey)) ||
          null;

        if (!hit) return actor;

        return {
          ...actor,
          id: actor.id ?? hit.id ?? null,
          image: actor.image ?? hit.image ?? null,
        };
      });
    },
  });
};
