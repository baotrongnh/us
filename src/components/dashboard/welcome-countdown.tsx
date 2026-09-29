"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import welcomeConfig from "@/data/welcome-modal.json";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getTimeLeft(targetDate: string, targetTime: string): TimeLeft | null {
  const target = new Date(`${targetDate}T${targetTime}:00`);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function WelcomeCountdown() {
  const [open, setOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!welcomeConfig.enabled) return;

    const update = () => {
      setTimeLeft(getTimeLeft(welcomeConfig.targetDate, welcomeConfig.targetTime));
    };

    update();
    intervalRef.current = setInterval(update, 1000);
    setOpen(true);
    requestAnimationFrame(() => setTimeout(() => setVisible(true), 50));

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setOpen(false), 350);
  };

  if (!open) return null;

  const hasArrived = timeLeft === null;

  return (
    <div
      className={`welcome-countdown-backdrop ${visible ? "visible" : ""}`}
      onMouseDown={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={welcomeConfig.title}
    >
      <div
        className={`welcome-countdown-modal ${visible ? "visible" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className="welcome-countdown-close"
          onClick={handleClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="welcome-countdown-deco" aria-hidden="true">
          <span>♡</span>
        </div>

        <p className="eyebrow welcome-countdown-eyebrow">{welcomeConfig.subtitle}</p>
        <h2 className="welcome-countdown-title">{welcomeConfig.title}</h2>

        {hasArrived ? (
          <div className="welcome-countdown-arrived">
            <p className="welcome-arrived-emoji">🎉</p>
            <p className="welcome-arrived-msg">{welcomeConfig.arrivedMessage}</p>
            <p className="welcome-arrived-sub">{welcomeConfig.arrivedSubtitle}</p>
          </div>
        ) : (
          <div className="countdown-grid">
            <div className="countdown-unit">
              <span className="countdown-number">{timeLeft.days}</span>
              <label className="countdown-label">days</label>
            </div>
            <div className="countdown-sep">:</div>
            <div className="countdown-unit">
              <span className="countdown-number">{pad(timeLeft.hours)}</span>
              <label className="countdown-label">hrs</label>
            </div>
            <div className="countdown-sep">:</div>
            <div className="countdown-unit">
              <span className="countdown-number">{pad(timeLeft.minutes)}</span>
              <label className="countdown-label">min</label>
            </div>
            <div className="countdown-sep">:</div>
            <div className="countdown-unit">
              <span className="countdown-number">{pad(timeLeft.seconds)}</span>
              <label className="countdown-label">sec</label>
            </div>
          </div>
        )}

        <div className="welcome-countdown-target">
          {new Date(`${welcomeConfig.targetDate}T${welcomeConfig.targetTime}:00`).toLocaleDateString("en-GB", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          · {welcomeConfig.targetTime}
        </div>

        <button className="welcome-countdown-btn" onClick={handleClose}>
          Okey
        </button>
      </div>
    </div>
  );
}
