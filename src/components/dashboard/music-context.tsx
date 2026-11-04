"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Track = {
  title: string;
  src: string;
  filename: string;
};

type MusicContextValue = {
  isPlaying: boolean;
  currentTrack: Track | null;
  playlist: Track[];
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  playNext: () => void;
  playPrev: () => void;
  selectTrack: (index: number) => void;
  currentIndex: number;
  userInteracted: boolean;
  notifyInteraction: () => void;
  isLoading: boolean;
  musicError: string | null;
};

const MusicContext = createContext<MusicContextValue | null>(null);

export function useMusicPlayer() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusicPlayer must be used inside MusicProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playlistRef = useRef<Track[]>([]);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);
  const pendingPlay = useRef(false);
  const autoplayAttempted = useRef(false);
  const autoplayPending = useRef(false);

  // Fetch playlist on mount
  useEffect(() => {
    fetch("/api/music")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load background music.");
        return response.json();
      })
      .then((data: { tracks: Track[] }) => {
        setIsLoading(data.tracks.length > 0);
        const shuffledTracks = [...data.tracks];
        for (let i = shuffledTracks.length - 1; i > 0; i--) {
          const randomIndex = Math.floor(Math.random() * (i + 1));
          [shuffledTracks[i], shuffledTracks[randomIndex]] = [
            shuffledTracks[randomIndex],
            shuffledTracks[i],
          ];
        }
        playlistRef.current = shuffledTracks;
        setPlaylist(shuffledTracks);
      })
      .catch((error: unknown) => {
        setIsLoading(false);
        setMusicError(
          error instanceof Error ? error.message : "Could not load background music."
        );
      });
  }, []);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = 0.7;
    audioRef.current = audio;

    audio.addEventListener("play", () => {
      autoplayPending.current = false;
      setIsLoading(false);
      setIsPlaying(true);
    });
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("loadstart", () => setIsLoading(true));
    audio.addEventListener("canplay", () => setIsLoading(false));
    audio.addEventListener("playing", () => setIsLoading(false));
    audio.addEventListener("waiting", () => setIsLoading(true));
    audio.addEventListener("error", () => {
      setIsLoading(false);
      setMusicError("Could not load this audio file.");
    });
    audio.addEventListener("ended", () => {
      const currentPlaylist = playlistRef.current;
      if (currentPlaylist.length <= 1) {
        audio.currentTime = 0;
        audio.play().catch(() => setMusicError("Could not play this audio file."));
        return;
      }
      setCurrentIndex((prev) => {
        return (prev + 1) % currentPlaylist.length;
      });
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // When playlist loads or currentIndex changes, update audio src
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || playlist.length === 0) return;
    const track = playlist[currentIndex];
    if (audio.src !== window.location.origin + track.src) {
      setIsLoading(true);
      const wasPlaying = !audio.paused;
      audio.src = track.src;
      audio.load();
      const shouldPlay = wasPlaying || pendingPlay.current || !autoplayAttempted.current;
      autoplayAttempted.current = true;
      pendingPlay.current = false;
      if (!shouldPlay) return;

      autoplayPending.current = true;
      audio.play().then(() => {
        autoplayPending.current = false;
        setMusicError(null);
      }).catch((error: unknown) => {
        const wasBlocked = error instanceof DOMException && error.name === "NotAllowedError";
        if (wasBlocked) return;
        setIsLoading(false);
        autoplayPending.current = false;
        setMusicError("Could not play this audio file.");
      });
    }
  }, [currentIndex, playlist]);

  useEffect(() => {
    const tryAutoplayAfterInteraction = () => {
      const audio = audioRef.current;
      if (!autoplayPending.current || !audio || !audio.src) return;

      audio.play().then(() => {
        autoplayPending.current = false;
        setUserInteracted(true);
        setMusicError(null);
      }).catch((error: unknown) => {
        const wasBlocked = error instanceof DOMException && error.name === "NotAllowedError";
        if (wasBlocked) return;
        autoplayPending.current = false;
        setMusicError("Could not play this audio file.");
      });
    };

    document.addEventListener("pointerdown", tryAutoplayAfterInteraction);
    document.addEventListener("keydown", tryAutoplayAfterInteraction);
    return () => {
      document.removeEventListener("pointerdown", tryAutoplayAfterInteraction);
      document.removeEventListener("keydown", tryAutoplayAfterInteraction);
    };
  }, []);

  // When user first interacts, try to start playback
  const notifyInteraction = useCallback(() => {
    if (userInteracted) return;
    setUserInteracted(true);
    const audio = audioRef.current;
    if (!audio || playlist.length === 0) {
      pendingPlay.current = true;
      return;
    }
    if (audio.src === "" || audio.src === window.location.origin + "/") {
      const track = playlist[currentIndex];
      audio.src = track.src;
      audio.load();
    }
    audio.play().catch(() => setMusicError("Could not play this audio file."));
  }, [userInteracted, playlist, currentIndex]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.src === "" || audio.src === window.location.origin + "/") {
      if (playlist.length > 0) {
        audio.src = playlist[currentIndex].src;
        audio.load();
      }
    }
    audio.play().catch(() => setMusicError("Could not play this audio file."));
  }, [playlist, currentIndex]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else if (!userInteracted) {
      notifyInteraction();
    } else {
      resume();
    }
  }, [userInteracted, isPlaying, pause, resume, notifyInteraction]);

  const playNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(playlist.length, 1));
    pendingPlay.current = true;
  }, [playlist.length]);

  const playPrev = useCallback(() => {
    setCurrentIndex((prev) =>
      prev === 0 ? Math.max(playlist.length - 1, 0) : prev - 1
    );
    pendingPlay.current = true;
  }, [playlist.length]);

  const selectTrack = useCallback(
    (index: number) => {
      if (index === currentIndex) {
        toggle();
      } else {
        setCurrentIndex(index);
        pendingPlay.current = true;
        if (!userInteracted) setUserInteracted(true);
      }
    },
    [currentIndex, toggle, userInteracted]
  );

  const currentTrack = playlist[currentIndex] ?? null;

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        currentTrack,
        playlist,
        pause,
        resume,
        toggle,
        playNext,
        playPrev,
        selectTrack,
        currentIndex,
        userInteracted,
        notifyInteraction,
        isLoading,
        musicError,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}
