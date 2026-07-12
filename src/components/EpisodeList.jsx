import { Link, useParams } from "react-router-dom";
import { parseEpisodeNumber, normalizeServerLabel } from '@/utils/episodes';

const formatEpisodeName = (name = "") => {
  const trimmed = String(name).trim();
  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return `Tập ${String(n).padStart(2, "0")}`;
  }
  return trimmed;
};

const EMPTY_EPISODES = [];

const EpisodeList = ({ episodes = EMPTY_EPISODES, serverLabel, showServerLabels = false }) => {
  const { slug } = useParams();

  const sortedEpisodes = (episodes || [])
    .map((ep, idx) => ({
      ep,
      idx,
      num: parseEpisodeNumber(ep?.name || ep?.slug),
    }))
    .sort((a, b) => {
      const aHasNum = a.num !== null && a.num !== undefined;
      const bHasNum = b.num !== null && b.num !== undefined;
      if (aHasNum && bHasNum) return a.num - b.num;
      if (aHasNum) return -1;
      if (bHasNum) return 1;
      return a.idx - b.idx;
    })
    .map(({ ep }) => ep);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {sortedEpisodes.map((episode, idx) => {
        const sLabel = normalizeServerLabel(episode.server_name);
        const epServerParam = showServerLabels ? `&server=${encodeURIComponent(sLabel)}` : (serverLabel ? `&server=${encodeURIComponent(serverLabel)}` : "");

        return (
          <Link
            key={`${sLabel}-${episode.slug || idx}`}
            to={`/watch/${slug}?episode=${encodeURIComponent(
              episode.slug
            )}${epServerParam}`}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:border-emerald-400/50 hover:text-emerald-200 text-center"
          >
            {showServerLabels
              ? sLabel
              : episodes.length === 1 && parseEpisodeNumber(episode.name || episode.slug) === 1
                ? "Full"
                : formatEpisodeName(episode.name || episode.slug)}
          </Link>
        );
      })}
    </div>
  );
};


export default EpisodeList;
