"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import content from "@/data/relationship.json";

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="music-player">
      <audio
        ref={audioRef}
        src={content.music.source}
        preload="metadata"
        autoPlay
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <button
        className={`music-toggle ${isPlaying ? "playing" : ""}`}
        onClick={togglePlayback}
        aria-label={isPlaying ? "Pause music" : "Play music"}
        title={isPlaying ? "Pause music" : "Play music"}
      >
        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      <div className="music-copy">
        <strong>{content.music.title}</strong>
        <span>{content.music.artist}</span>
      </div>
    </div>
  );
}
