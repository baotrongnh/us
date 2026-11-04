"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import welcomeConfig from "@/data/welcome-modal.json";
import { useLanguage } from "@/components/dashboard/language-context";

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

export function WelcomeCountdown({ onDismiss }: { onDismiss: () => void }) {
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!welcomeConfig.enabled) {
      const frame = requestAnimationFrame(onDismiss);
      return () => cancelAnimationFrame(frame);
    }

    const update = () => {
      setTimeLeft(getTimeLeft(welcomeConfig.targetDate, welcomeConfig.targetTime));
    };

    const initialUpdate = window.setTimeout(() => {
      update();
      setOpen(true);
    }, 0);
    intervalRef.current = setInterval(update, 1000);
    const showModal = window.setTimeout(() => setVisible(true), 50);

    return () => {
      window.clearTimeout(initialUpdate);
      window.clearTimeout(showModal);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onDismiss]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      setOpen(false);
      onDismiss();
    }, 650);
  };

  if (!open) return null;

  const hasArrived = timeLeft === null;

  return (
    <div
      className={`ui-modal-backdrop welcome-countdown-backdrop ${visible ? "visible" : ""}`}
      onMouseDown={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("welcomeTitle")}
    >
      <div
        className={`ui-modal-surface welcome-countdown-modal ${visible ? "visible" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className="ui-modal-close welcome-countdown-close"
          onClick={handleClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="welcome-countdown-deco" aria-hidden="true">
          <span>♡</span>
        </div>

        <p className="eyebrow welcome-countdown-eyebrow">{t("welcomeEyebrow")}</p>
        <h2 className="welcome-countdown-title">{t("welcomeTitle")}</h2>

        {hasArrived ? (
          <div className="welcome-countdown-arrived">
            <p className="welcome-arrived-emoji">🎉</p>
            <p className="welcome-arrived-msg">{t("welcomeArrived")}</p>
            <p className="welcome-arrived-sub">{t("welcomeArrivedSubtitle")}</p>
          </div>
        ) : (
          <div className="countdown-grid">
            <div className="countdown-unit">
              <span className="countdown-number">{timeLeft.days}</span>
              <label className="countdown-label">{t("days")}</label>
            </div>
            <div className="countdown-sep">:</div>
            <div className="countdown-unit">
              <span className="countdown-number">{pad(timeLeft.hours)}</span>
              <label className="countdown-label">{t("hoursShort")}</label>
            </div>
            <div className="countdown-sep">:</div>
            <div className="countdown-unit">
              <span className="countdown-number">{pad(timeLeft.minutes)}</span>
              <label className="countdown-label">{t("minutesShort")}</label>
            </div>
            <div className="countdown-sep">:</div>
            <div className="countdown-unit">
              <span className="countdown-number">{pad(timeLeft.seconds)}</span>
              <label className="countdown-label">{t("secondsShort")}</label>
            </div>
          </div>
        )}

        <div className="welcome-countdown-target">
          {new Date(`${welcomeConfig.targetDate}T${welcomeConfig.targetTime}:00`).toLocaleDateString(locale, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          · {welcomeConfig.targetTime}
        </div>

        <button className="welcome-countdown-btn" onClick={handleClose}>
          {t("okay")}
        </button>
      </div>
    </div>
  );
}
