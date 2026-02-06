import { Link, useParams } from "react-router-dom";

const EpisodeList = ({ episodes = [] }) => {
  const { slug } = useParams();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {episodes.map((episode) => (
        <Link
          key={episode.slug}
          to={`/watch/${slug}?episode=${encodeURIComponent(episode.slug)}`}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:border-emerald-400/50 hover:text-emerald-200"
        >
          {episode.name || episode.slug}
        </Link>
      ))}
    </div>
  );
};

export default EpisodeList;
