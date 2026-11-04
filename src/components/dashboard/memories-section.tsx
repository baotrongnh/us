"use client";

import { ImageIcon, MapPin, Plus } from "lucide-react";
import memoriesData from "@/data/memories.json";
import { useLanguage } from "@/components/dashboard/language-context";
import type { RecentItem } from "@/lib/types";

export function MemoriesSection({
  onOpenImage,
  onAddMemory,
}: {
  onOpenImage: (source: string, title: string) => void;
  onAddMemory: () => void;
}) {
  const { t } = useLanguage();
  const recentItems = memoriesData.recentItems as RecentItem[];

  return (
    <section className="section-block memories-page">
      <div className="section-header memories-page-header">
        <div>
          <p className="eyebrow">{t("memoriesPageEyebrow")}</p>
          <h2>{t("memories")}</h2>
        </div>
        <div className="memories-page-actions">
          <span className="memories-count">
            <ImageIcon size={15} aria-hidden="true" />
            {recentItems.length} {t("memoryCount")}
          </span>
          <button type="button" className="add-memory memories-add-btn" onClick={onAddMemory}>
            <Plus size={16} aria-hidden="true" />
            {t("addMemory")}
          </button>
        </div>
      </div>

      <div className="memories-all-grid">
        {recentItems.map((item, index) => (
          <button
            type="button"
            key={`${item.title}-${index}`}
            className="memories-thumb"
            onClick={() => onOpenImage(item.image ?? "", item.title)}
            aria-label={`${t("viewPhoto")}: ${item.title}`}
          >
            <span
              className="memories-thumb-img"
              style={{ backgroundImage: `url('${item.image ?? ""}')` }}
            />
            <span className="memories-thumb-date">{item.dateLabel}</span>
            <span className="memories-thumb-info">
              <strong>{item.title}</strong>
              <span>
                <MapPin size={12} aria-hidden="true" />
                {item.meta}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
