"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, MapPin, Plus } from "lucide-react";
import memoriesData from "@/data/memories.json";
import { useLanguage } from "@/components/dashboard/language-context";
import type { RecentItem } from "@/lib/types";

function MemoryCard({
  item,
  onOpenImage,
  viewPhotoLabel,
  memoryLabel,
}: {
  item: RecentItem;
  onOpenImage: (source: string, title: string) => void;
  viewPhotoLabel: string;
  memoryLabel: string;
}) {
  return (
    <article className="recent-card memory-card">
      <button
        type="button"
        className="recent-image-button"
        onClick={() => onOpenImage(item.image ?? "", item.title)}
        aria-label={`Open photo: ${item.title}`}
      >
        <div
          aria-hidden="true"
          className="mini-image"
          style={{ backgroundImage: `url('${item.image ?? ""}')` }}
        />
        <span className="image-view-hint">{viewPhotoLabel}</span>
      </button>
      <div className="recent-card-copy">
        <p className="card-kind">
          {memoryLabel} <span>•</span> {item.dateLabel}
        </p>
        <h3>{item.title}</h3>
        <p className="card-meta">
          <MapPin size={14} /> {item.meta}
        </p>
      </div>
    </article>
  );
}

export function MemoriesSection({
  onOpenImage,
  onAddMemory,
}: {
  onOpenImage: (source: string, title: string) => void;
  onAddMemory: () => void;
}) {
  const { t } = useLanguage();
  const [recentItems] = useState<RecentItem[]>(
    () => memoriesData.recentItems as RecentItem[]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const fullGridRef = useRef<HTMLDivElement>(null);

  const scrollTo = (dir: "prev" | "next") => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: (dir === "next" ? 1 : -1) * el.clientWidth * 0.86, behavior: "smooth" });
  };

  const onScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const nearest = cards.reduce(
      (closest, card, i) =>
        Math.abs(card.offsetLeft - el.scrollLeft) <
        Math.abs(cards[closest].offsetLeft - el.scrollLeft)
          ? i
          : closest,
      0
    );
    setActiveIndex(nearest);
  };

  const scrollToFullGrid = () => {
    fullGridRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="section-block recently-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">{t("recentEyebrow")}</p>
          <h2>{t("recently")}</h2>
        </div>
        <div className="section-header-actions">
          <button className="add-memory memories-add-btn" onClick={onAddMemory}>
            <Plus size={16} /> {t("addMemory")}
          </button>
          <button className="text-button" onClick={scrollToFullGrid}>
            {t("viewAll")} <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="recent-carousel">
        <div className="recent-grid" ref={carouselRef} onScroll={onScroll}>
          {recentItems.map((item, idx) => (
            <MemoryCard
              key={`${item.title}-${idx}`}
              item={item}
              onOpenImage={onOpenImage}
              viewPhotoLabel={t("viewPhoto")}
              memoryLabel={t("memoryLabel")}
            />
          ))}
        </div>
        {recentItems.length > 1 && (
          <div className="carousel-controls">
            <button type="button" aria-label={t("previous")} onClick={() => scrollTo("prev")}>
              <ChevronLeft size={17} />
            </button>
            <span>
              {activeIndex + 1} <i>/</i> {recentItems.length}
            </span>
            <button type="button" aria-label={t("next")} onClick={() => scrollTo("next")}>
              <ChevronRight size={17} />
            </button>
          </div>
        )}
      </div>

      <div className="memories-full-grid" ref={fullGridRef}>
        <div className="memories-full-header">
          <ImageIcon size={18} />
          <span>{t("allMemories")}</span>
        </div>
        <div className="memories-all-grid">
          {recentItems.map((item, idx) => (
            <button
              key={`full-${idx}`}
              className="memories-thumb"
              onClick={() => onOpenImage(item.image ?? "", item.title)}
              aria-label={item.title}
            >
              <div
                className="memories-thumb-img"
                style={{ backgroundImage: `url('${item.image ?? ""}')` }}
              />
              <div className="memories-thumb-info">
                <strong>{item.title}</strong>
                <span>{item.dateLabel} · {item.meta}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
