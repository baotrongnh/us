"use client";

import { Clock3, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/dashboard/language-context";

export function ComingSoonPanel() {
  const { t } = useLanguage();

  return (
    <section className="section-block coming-soon-section">
      <div className="coming-soon-card">
        <div className="coming-soon-art" aria-hidden="true">
          <span className="coming-soon-orbit coming-soon-orbit-one" />
          <span className="coming-soon-orbit coming-soon-orbit-two" />
          <span className="coming-soon-icon">
            <Clock3 size={34} strokeWidth={1.5} />
          </span>
          <Sparkles className="coming-soon-sparkle" size={19} />
        </div>
        <p className="eyebrow">{t("comingSoonEyebrow")}</p>
        <h2>{t("comingSoonTitle")}</h2>
        <p className="coming-soon-description">{t("comingSoonDescription")}</p>
        <span className="coming-soon-badge">
          <span className="coming-soon-status-dot" />
          {t("comingSoonStatus")}
        </span>
      </div>
    </section>
  );
}
