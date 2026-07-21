import React, { memo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import Player from '@/features/movies/components/Player.jsx';
import { parseEpisodeNumber } from '@/utils/episodes';

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
    player,
    subtitles = [],
    showSubtitleOverlay = false, // Thay đổi giá trị mặc định sang false
    setShowSubtitleOverlay,
    selectedSubLanguage,
    setSelectedSubLanguage,
  }) => {
    const [activeLine, setActiveLine] = useState(null);
    // Keep a ref to avoid stale closure inside the event handler
    const activeLineRef = useRef(null);

    // Listen to video:timeupdate to extract active subtitle line
    useEffect(() => {
      if (!player || !subtitles || subtitles.length === 0 || !showSubtitleOverlay) {
        if (activeLineRef.current !== null) {
          activeLineRef.current = null;
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setActiveLine(null);
        }
        return;
      }

      const handleTimeUpdate = () => {
        const time = player.video.currentTime;
        const current = subtitles.find(
          (line) => time >= line.startTime && time <= line.endTime
        ) || null;
        if (current !== activeLineRef.current) {
          activeLineRef.current = current;
          setActiveLine(current);
        }
      };

      player.on("video:timeupdate", handleTimeUpdate);
      return () => player.off("video:timeupdate", handleTimeUpdate);
    }, [player, subtitles, showSubtitleOverlay]);

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
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
                <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Info className="size-8 text-amber-400" />
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
          <div className="relative">
            <Player
              source={activeSource}
              poster={movie?.thumb_url || movie?.poster_url || "/player_poster.png"}
              title={movie?.name}
              subtitle={
                activeEpisode?.name
                  ? `${episodes.length === 1 &&
                    parseEpisodeNumber(activeEpisode.name) === 1
                    ? "Full Movie"
                    : activeEpisode.name
                  } • ${activeServer || "Vietsub"} • ${activeProviderLabel}`
                  : undefined
              }
              onNextEpisode={onNextEpisode}
              hasNextEpisode={!!onNextEpisode}
              episodeSlug={activeEpisode?.slug || activeEpisode?.name}
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
              selectedSubLanguage={selectedSubLanguage}
              setSelectedSubLanguage={setSelectedSubLanguage}
              showSubtitleOverlay={showSubtitleOverlay}
              setShowSubtitleOverlay={setShowSubtitleOverlay}
            />

            {/* Custom Bilingual Subtitle Overlay */}
            {showSubtitleOverlay && activeLine && player?.template?.$player
              ? createPortal(
                  <div className="absolute top-[calc(0.5rem+env(safe-area-inset-top,0px))] sm:top-[calc(1rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full max-w-[90%] sm:max-w-[80%] md:max-w-[70%] text-center">
                    <div className="inline-block whitespace-pre-line px-2">
                      {activeLine.text && (
                        <p className="text-white text-[13px] sm:text-base md:text-lg lg:text-xl font-bold leading-normal tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {activeLine.text}
                        </p>
                      )}
                      {activeLine.translation && activeLine.translation !== activeLine.text && (
                        <p className="text-emerald-400 text-[11px] sm:text-sm md:text-base lg:text-lg font-semibold mt-0.5 sm:mt-1 leading-normal tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {activeLine.translation}
                        </p>
                      )}
                    </div>
                  </div>,
                  player.template.$player
                )
              : null}
          </div>
        )}
      </div>
    );
  }
);

export default PlayerSection;
