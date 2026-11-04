"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  ListMusic,
  Pause,
  Play,
  X,
} from "lucide-react";
import { useMusicPlayer } from "@/components/dashboard/music-context";
import { useLanguage } from "@/components/dashboard/language-context";

export function MusicPlayer() {
  const { t } = useLanguage();
  const {
    isPlaying,
    currentTrack,
    playlist,
    toggle,
    playNext,
    playPrev,
    selectTrack,
    currentIndex,
    isLoading,
    musicError,
  } = useMusicPlayer();

  const [showPlaylist, setShowPlaylist] = useState(false);
  const [titleOverflows, setTitleOverflows] = useState(false);
  const titleViewportRef = useRef<HTMLSpanElement>(null);
  const titleTextRef = useRef<HTMLSpanElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPlaylist) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPlaylist(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showPlaylist]);

  const displayTitle =
    currentTrack?.title ??
    (musicError ? t("musicUnavailable") : t("addMusicFiles"));

  // Split "Song – Artist" style titles
  const parts = displayTitle.split(/\s[|–—-]\s/);
  const songTitle = parts[0]?.trim() ?? displayTitle;
  const artist = parts[1]?.trim() ?? "";

  useEffect(() => {
    const viewport = titleViewportRef.current;
    const text = titleTextRef.current;
    if (!viewport || !text) return;

    const updateOverflow = () => {
      setTitleOverflows(text.scrollWidth > viewport.clientWidth + 1);
    };

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(viewport);
    observer.observe(text);
    return () => observer.disconnect();
  }, [songTitle]);

  if (isLoading) {
    return (
      <div
        className="music-player music-player-loading"
        role="status"
        aria-label={t("loadingMusic")}
        aria-busy="true"
      >
        <LoaderCircle size={18} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="music-player">
      {/* Prev */}
      {playlist.length > 1 && (
        <button
          className="music-nav-btn"
          onClick={playPrev}
          aria-label={t("previousTrack")}
          title={t("previousTrack")}
        >
          <ChevronLeft size={13} />
        </button>
      )}

      {/* Play / Pause */}
      <button
        className={`music-toggle ${isPlaying ? "playing" : ""}`}
        onClick={toggle}
        aria-label={
          isPlaying
            ? t("pause")
            : currentTrack
              ? t("play")
              : t("addMusicFiles")
        }
        title={
          musicError ??
          (currentTrack ? (isPlaying ? t("pause") : t("play")) : displayTitle)
        }
      >
        {isPlaying ? (
          <Pause size={13} fill="currentColor" />
        ) : (
          <Play size={13} fill="currentColor" style={{ transform: "translateX(1px)" }} />
        )}
      </button>

      {/* Next */}
      {playlist.length > 1 && (
        <button
          className="music-nav-btn"
          onClick={playNext}
          aria-label={t("nextTrack")}
          title={t("nextTrack")}
        >
          <ChevronRight size={13} />
        </button>
      )}

      {/* Track info */}
      <div className="music-copy">
        <strong title={songTitle}>
          <span className="music-track-title" ref={titleViewportRef}>
            <span className={`music-track-title-run ${titleOverflows ? "scrolling" : ""}`}>
              <span ref={titleTextRef}>{songTitle}</span>
              {titleOverflows && <span aria-hidden="true">{songTitle}</span>}
            </span>
          </span>
        </strong>
        {artist && <span title={artist}>{artist}</span>}
        {!artist && playlist.length > 1 && (
          <span style={{ opacity: 0.6 }}>
            {currentIndex + 1} / {playlist.length}
          </span>
        )}
      </div>

      {/* Playlist toggle */}
      {playlist.length > 1 && (
        <button
          className="music-playlist-btn"
          aria-haspopup="listbox"
          aria-expanded={showPlaylist}
          onClick={() => setShowPlaylist((v) => !v)}
          aria-label={t("togglePlaylist")}
          title={t("playlist")}
        >
          <ListMusic size={13} />
        </button>
      )}

      {/* Playlist dropdown */}
      {showPlaylist && (
        <div
          className="music-playlist-dropdown theme-picker-menu"
          ref={dropdownRef}
        >
          <div className="music-playlist-header">
            <span>{t("playlist")}</span>
            <button
              className="music-playlist-close"
              onClick={() => setShowPlaylist(false)}
              aria-label={t("closePlaylist")}
            >
              <X size={14} />
            </button>
          </div>
          <div className="music-playlist-list" role="listbox" aria-label={t("playlist")}>
            {playlist.map((track, i) => (
              <button
                type="button"
                key={track.src}
                className={`music-playlist-item theme-picker-option ${i === currentIndex ? "active selected" : ""}`}
                role="option"
                aria-selected={i === currentIndex}
                onClick={() => {
                  selectTrack(i);
                  setShowPlaylist(false);
                }}
              >
                <span className="playlist-play-icon">
                  {i === currentIndex && isPlaying ? (
                    <Pause size={11} fill="currentColor" />
                  ) : (
                    <Play size={11} fill="currentColor" />
                  )}
                </span>
                <span className="playlist-track-name">{track.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
