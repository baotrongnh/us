"use client";

import { Heart, Sparkles } from "lucide-react";
import { LanguagePicker } from "@/components/dashboard/language-picker";
import { useLanguage } from "@/components/dashboard/language-context";

export function MaintenancePage() {
  const { t } = useLanguage();

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
        <span className="maintenance-footer">{t("maintenanceFooter")}</span>
      </div>
    </main>
  );
}
