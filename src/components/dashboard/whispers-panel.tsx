"use client";

import { useEffect, useRef, useState } from "react";
import {
  Lock,
  Mic,
  Pause,
  Play,
  Volume2,
  X,
} from "lucide-react";
import { useMusicPlayer } from "@/components/dashboard/music-context";
import { useLanguage } from "@/components/dashboard/language-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type WhisperEntry = {
  id: number;
  title: string;
  src: string;
  filename: string;
};

// ── PIN Gate ─────────────────────────────────────────────────────────────────

function WhispersPasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useLanguage();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [shaking, setShaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const checkCode = async (nextDigits: string[]) => {
    if (nextDigits.some((d) => d === "") || isVerifying) return;
    const pin = nextDigits.join("");
    setIsVerifying(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/whispers/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess();
      } else {
        setShaking(true);
        setErrorMsg(data.error || t("incorrectPin"));
        setTimeout(() => {
          setDigits(["", "", "", "", "", ""]);
          setShaking(false);
          inputRefs.current[0]?.focus();
        }, 650);
      }
    } catch {
      setShaking(true);
      setErrorMsg(t("networkError"));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    checkCode(next);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
  };

  return (
    <div className="letters-gate">
      <div className="letters-gate-inner">
        <div className="letters-gate-icon" aria-hidden="true">
          <Lock size={26} />
        </div>
        <h2 className="letters-gate-title">{t("whispers")}</h2>
        <p className="letters-gate-sub">
          {t("enterSixDigitCode")}
        </p>
        <div className={`pin-row ${shaking ? "pin-shake" : ""}`}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              id={`whispers-pin-${i}`}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              disabled={isVerifying}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`pin-input ${d ? "pin-filled" : ""}`}
              aria-label={`${i + 1}`}
            />
          ))}
        </div>
        {errorMsg && <p className="pin-error-msg">{errorMsg}</p>}
        <p className="letters-gate-hint">
          <Lock size={11} /> {t("privateOnlyUs")}
        </p>
      </div>
    </div>
  );
}

// ── Whisper Modal ─────────────────────────────────────────────────────────────

function WhisperModal({
  whisper,
  onClose,
}: {
  whisper: WhisperEntry;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { pause: pauseMusic, isPlaying: musicPlaying, resume: resumeMusic } =
    useMusicPlayer();
  const musicWasPaused = useRef(!musicPlaying);

  // Pause background music when modal opens
  useEffect(() => {
    musicWasPaused.current = !musicPlaying;
    if (musicPlaying) pauseMusic();
    return () => {
      if (!musicWasPaused.current) resumeMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-play whisper on open
  useEffect(() => {
    audioRef.current?.play().catch(() => {});
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="ui-modal-backdrop whisper-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${t("listen")}: ${whisper.title}`}
      onMouseDown={onClose}
    >
      <div className="ui-modal-surface whisper-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button
          className="ui-modal-close whisper-modal-close"
          onClick={onClose}
          aria-label={t("close")}
        >
          <X size={17} />
        </button>

        <div className="whisper-modal-icon">
          <Mic size={22} />
        </div>

        <p className="whisper-modal-eyebrow">{t("whisperLabel")}</p>
        <h2 className="whisper-modal-title">{whisper.title}</h2>

        <audio
          ref={audioRef}
          src={whisper.src}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            const a = audioRef.current;
            if (!a) return;
            setCurrentTime(a.currentTime);
            setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
          }}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        />

        {/* Progress bar */}
        <div
          className="whisper-progress-bar"
          role="slider"
          aria-label={t("listen")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          onClick={handleSeek}
        >
          <div className="whisper-progress-fill" style={{ width: `${progress}%` }} />
          <div className="whisper-progress-thumb" style={{ left: `${progress}%` }} />
        </div>

        <div className="whisper-time-row">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>

        <button
          className={`whisper-play-btn ${isPlaying ? "playing" : ""}`}
          onClick={togglePlay}
          aria-label={isPlaying ? t("pause") : t("play")}
        >
          {isPlaying ? (
            <Pause size={22} fill="currentColor" />
          ) : (
            <Play size={22} fill="currentColor" />
          )}
        </button>

        <p className="whisper-modal-hint">
          <Volume2 size={12} /> {t("musicPausedHint")}
        </p>
      </div>
    </div>
  );
}

// ── Main Whispers Panel ───────────────────────────────────────────────────────

export function WhispersPanel() {
  const { t } = useLanguage();
  const [unlocked, setUnlocked] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [whispers, setWhispers] = useState<WhisperEntry[]>([]);
  const [active, setActive] = useState<WhisperEntry | null>(null);

  // Try session on mount (cookie may already exist from a previous visit)
  useEffect(() => {
    fetch("/api/whispers")
      .then((res) => {
        if (res.ok) {
          return res.json().then((data: { whispers: WhisperEntry[] }) => {
            setWhispers(data.whispers);
            setUnlocked(true);
          });
        }
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, []);

  const fetchWhispers = async () => {
    try {
      const res = await fetch("/api/whispers");
      if (res.ok) {
        const data: { whispers: WhisperEntry[] } = await res.json();
        setWhispers(data.whispers);
        setUnlocked(true);
      }
    } catch {}
  };

  if (checkingAuth) {
    return (
      <div className="letters-gate">
        <div className="letters-gate-inner">
          <p className="letters-gate-sub">{t("checkingAuthentication")}</p>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return <WhispersPasswordGate onSuccess={fetchWhispers} />;
  }

  return (
    <>
      <section className="section-block whispers-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">{t("fromTheHeart")}</p>
            <h2>{t("whispers")}</h2>
          </div>
          <span className="whispers-count-badge">
            <Mic size={13} /> {whispers.length} {whispers.length === 1 ? t("recording") : t("recordings")}
          </span>
        </div>

        {whispers.length === 0 ? (
          <div className="whispers-empty">
            <Mic size={32} strokeWidth={1.2} />
            <p>{t("noWhispers")}</p>
            <span>
              {t("addWhisperAudio")} <code>public/audio/whispers/</code>
            </span>
          </div>
        ) : (
          <ul className="whispers-list">
            {whispers.map((w) => (
              <li key={w.id}>
                <button
                  className="whisper-card"
                  onClick={() => setActive(w)}
                  aria-label={`${t("listen")}: ${w.title}`}
                >
                  <div className="whisper-card-icon">
                    <Mic size={18} />
                  </div>
                  <div className="whisper-card-body">
                    <strong>{w.title}</strong>
                    <span>{t("tapToListen")}</span>
                  </div>
                  <div className="whisper-card-play">
                    <Play size={14} fill="currentColor" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="letters-hint">
          <Lock size={12} /> {t("eachWhisperPrivate")}
        </p>
      </section>

      {active && (
        <WhisperModal whisper={active} onClose={() => setActive(null)} />
      )}
    </>
  );
}
