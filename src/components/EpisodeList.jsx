import { Link, useParams } from "react-router-dom";
import { parseEpisodeNumber } from "../utils/episodes";

const EpisodeList = ({ episodes = [], serverLabel }) => {
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

  const serverParam = serverLabel
    ? `&server=${encodeURIComponent(serverLabel)}`
    : "";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {sortedEpisodes.map((episode, idx) => (
        <Link
          key={`${serverLabel || "default"}-${episode.slug || idx}`}
          to={`/watch/${slug}?episode=${encodeURIComponent(
            episode.slug
          )}${serverParam}`}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:border-emerald-400/50 hover:text-emerald-200"
        >
          {episode.name || episode.slug}
        </Link>
      ))}
    </div>
  );
};

export default EpisodeList;
