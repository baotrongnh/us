"use client";

import { Heart, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { LanguagePicker } from "@/components/dashboard/language-picker";
import { useLanguage } from "@/components/dashboard/language-context";

function getTimeParts(totalSeconds: number) {
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function MaintenancePage({ maintenanceEndsAt }: { maintenanceEndsAt: string | null }) {
  const { t } = useLanguage();
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!maintenanceEndsAt) return;
    const endTime = Date.parse(maintenanceEndsAt);
    if (!Number.isFinite(endTime)) return;

    const updateCountdown = () => {
      setRemainingSeconds(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
    };
    const initialUpdate = window.setTimeout(updateCountdown, 0);
    const interval = window.setInterval(updateCountdown, 1000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, [maintenanceEndsAt]);

  const timeParts = remainingSeconds === null ? null : getTimeParts(remainingSeconds);

  return (
    <main className="maintenance-page">
      <div className="maintenance-language-picker">
        <LanguagePicker />
      </div>
      <div className="maintenance-card">
        <div className="maintenance-illustration" aria-hidden="true">
          <span className="maintenance-sparkle maintenance-sparkle-one">✦</span>
          <span className="maintenance-sparkle maintenance-sparkle-two">✧</span>
          <div className="maintenance-heart">
            <Heart size={38} fill="currentColor" />
          </div>
          <Sparkles className="maintenance-stars" size={23} />
        </div>
        <p className="maintenance-eyebrow">{t("maintenanceEyebrow")}</p>
        <h1>{t("maintenanceTitle")}</h1>
        <p className="maintenance-message">{t("maintenanceMessage")}</p>
        <div className="maintenance-status">
          <span className="maintenance-status-dot" />
          {t("maintenanceStatus")}
        </div>
        {timeParts && (
          <section className="maintenance-countdown" aria-label={t("maintenanceCountdownTitle")}>
            <h2>{t("maintenanceCountdownTitle")}</h2>
            {remainingSeconds === 0 ? (
              <p>{t("maintenanceCountdownReached")}</p>
            ) : (
              <div className="maintenance-countdown-grid" role="timer" aria-live="off">
                {([
                  ["days", timeParts.days],
                  ["hoursShort", timeParts.hours],
                  ["minutesShort", timeParts.minutes],
                  ["secondsShort", timeParts.seconds],
                ] as const).map(([label, value]) => (
                  <div className="maintenance-countdown-unit" key={label}>
                    <strong>{label === "days" ? value : String(value).padStart(2, "0")}</strong>
                    <span>{t(label)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        <span className="maintenance-footer">{t("maintenanceFooter")}</span>
      </div>
    </main>
  );
}
