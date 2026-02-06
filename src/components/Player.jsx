import Hls from "hls.js";
import { useEffect, useRef } from "react";
import ReactPlayer from "react-player";

const Player = ({ source, poster }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!source || !source.endsWith(".m3u8") || !videoRef.current)
      return undefined;

    if (Hls.isSupported()) {
      const hls = new Hls({ capLevelToPlayerSize: true });
      hls.loadSource(source);
      hls.attachMedia(videoRef.current);
      return () => hls.destroy();
    }

    videoRef.current.src = source;
    return undefined;
  }, [source]);

  if (!source) {
    return (
      <div className="aspect-video rounded-2xl border border-white/10 bg-slate-900/60" />
    );
  }

  if (source.endsWith(".m3u8")) {
    return (
      <video
        ref={videoRef}
        controls
        poster={poster}
        className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"
      />
    );
  }

  if (source.includes("iframe") || source.includes("embed")) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
        <iframe
          title="player"
          src={source}
          className="h-full w-full"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
      <ReactPlayer
        url={source}
        controls
        width="100%"
        height="100%"
        light={poster}
      />
    </div>
  );
};

export default Player;
