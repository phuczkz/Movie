import React, { memo } from "react";
import { Info } from "lucide-react";
import Player from "../Player";
import { parseEpisodeNumber } from "../../utils/episodes";

const PlayerSection = memo(
  ({
    movieOverride,
    activeSource,
    movie,
    activeEpisode,
    episodes,
    activeServer,
    activeProviderLabel,
    onNextEpisode,
    onTimeUpdate,
    initialTime,
    onPlaybackIssue,
    playerRef,
    currentSeason,
    nextSeason,
    isLastEpisodeOfSeason,
    onReady,
  }) => {
    return (
      <div ref={playerRef} className="relative z-10">
        {movieOverride?.mode === "trailer" ? (
          <div
            className="relative w-full overflow-hidden rounded-2xl bg-slate-900 border border-white/10 shadow-2xl"
            style={{ aspectRatio: "16/9" }}
          >
            {movieOverride.trailerUrl ? (
              <iframe
                src={movieOverride.trailerUrl}
                title="Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
                <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Info className="h-8 w-8 text-amber-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-white font-bold text-lg">
                    Phim đang chuẩn bị
                  </p>
                  <p className="text-slate-400 text-sm">
                    Phim này hiện chỉ có trailer. Vui lòng quay lại sau.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Player
            source={activeSource}
            poster="/anime_player_poster.png"
            title={movie?.name}
            subtitle={
              activeEpisode?.name
                ? `${
                    episodes.length === 1 &&
                    parseEpisodeNumber(activeEpisode.name) === 1
                      ? "Full Movie"
                      : activeEpisode.name
                  } • ${activeServer || "Vietsub"} • ${activeProviderLabel}`
                : undefined
            }
            onNextEpisode={onNextEpisode}
            hasNextEpisode={!!onNextEpisode}
            nextEpisodeTitle={
              isLastEpisodeOfSeason && nextSeason
                ? `Chuyển sang Phần ${nextSeason.season}`
                : "Tập tiếp theo"
            }
            onTimeUpdate={onTimeUpdate}
            initialTime={initialTime}
            onPlaybackIssue={onPlaybackIssue}
            currentSeason={currentSeason}
            nextSeason={nextSeason}
            isLastEpisodeOfSeason={isLastEpisodeOfSeason}
            movieSlug={movie?.slug}
            onReady={onReady}
          />
        )}
      </div>
    );
  }
);

export default PlayerSection;
