"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Clock3, MapPin, Shuffle } from "lucide-react";
import randomDatesData from "@/data/random-dates.json";
import { useLanguage, type TranslationKey } from "@/components/dashboard/language-context";

export const randomDateIdeaTranslations: Record<string, {
  title: TranslationKey;
  description: TranslationKey;
  duration: TranslationKey;
  budget: TranslationKey;
}> = {
  cooking: {
    title: "cookingTogether",
    description: "cookingDescription",
    duration: "cookingDuration",
    budget: "cookingBudget",
  },
  "west-lake-cycling": {
    title: "westLakeCycling",
    description: "westLakeDescription",
    duration: "hours",
    budget: "bikeRental",
  },
  "saigon-river-walk": {
    title: "saigonRiverWalk",
    description: "saigonRiverWalkDescription",
    duration: "saigonWalkDuration",
    budget: "freeActivity",
  },
};

const locations = ["hanoi", "ho-chi-minh"] as const;
type DateLocation = (typeof locations)[number];

export function RandomDatePanel() {
  const { t } = useLanguage();
  const [notice, setNotice] = useState<string | null>(null);
  const [location, setLocation] = useState<DateLocation>("hanoi");
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinTimerRef = useRef<number | null>(null);

  const showNotice = () => {
    setNotice(t("savingComingSoon"));
    window.setTimeout(() => setNotice(null), 3000);
  };
  const ideas = randomDatesData.ideas.filter(
    (idea) => idea.location === "all" || idea.location === location
  );
  const selectedIdea = ideas.find((idea) => idea.id === selectedIdeaId) ?? ideas[0];

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) window.clearTimeout(spinTimerRef.current);
    };
  }, []);

  const spinForIdea = () => {
    if (isSpinning || ideas.length < 2) return;

    setIsSpinning(true);
    const currentIndex = Math.max(0, ideas.findIndex((idea) => idea.id === selectedIdea?.id));
    const destinationOffset = Math.floor(Math.random() * ideas.length);
    const totalSteps = ideas.length * 5 + destinationOffset;
    let remainingSteps = totalSteps;
    let step = 0;

    const advance = () => {
      step += 1;
      const nextIndex = (currentIndex + step) % ideas.length;
      setSelectedIdeaId(ideas[nextIndex].id);
      remainingSteps -= 1;

      if (remainingSteps === 0) {
        setIsSpinning(false);
        spinTimerRef.current = null;
        return;
      }

      const progress = step / totalSteps;
      const delay = 90 + Math.round(800 * progress * progress);
      spinTimerRef.current = window.setTimeout(advance, delay);
    };

    spinTimerRef.current = window.setTimeout(advance, 65);
  };

  const selectLocation = (nextLocation: DateLocation) => {
    if (spinTimerRef.current) window.clearTimeout(spinTimerRef.current);
    spinTimerRef.current = null;
    setIsSpinning(false);
    setLocation(nextLocation);
    setSelectedIdeaId(null);
  };

  return (
    <section className="section-block random-date-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">{t("aLittleFreshAir")}</p>
          <h2>{t("randomDate")}</h2>
        </div>
        <label className="random-date-location">
          <MapPin size={15} aria-hidden="true" />
          <span>{t("location")}</span>
          <select
            value={location}
            onChange={(event) => selectLocation(
              event.target.value === "ho-chi-minh" ? "ho-chi-minh" : "hanoi"
            )}
            aria-label={t("location")}
          >
            {locations.map((item) => (
              <option key={item} value={item}>
                {t(item === "hanoi" ? "locationHanoi" : "locationHoChiMinh")}
              </option>
            ))}
          </select>
        </label>
      </div>

      {notice && (
        <div role="status" className="random-date-toast">
          <span>{notice}</span>
        </div>
      )}

      <div className="random-date-randomizer">
        <p aria-live="polite">
          {isSpinning ? t("spinningForDate") : t("randomDatePrompt")}
        </p>
        <button
          type="button"
          className={`random-date-spin-btn ${isSpinning ? "is-spinning" : ""}`}
          onClick={spinForIdea}
          disabled={isSpinning || ideas.length < 2}
        >
          <Shuffle size={16} aria-hidden="true" />
          {t(isSpinning ? "spinning" : "randomizeDate")}
        </button>
      </div>

      <div className="random-date-ideas">
        {selectedIdea && (() => {
          const idea = selectedIdea;
          const copy = randomDateIdeaTranslations[idea.id];
          if (!copy) return null;
          const isShared = idea.location === "all";
          const title = t(copy.title);

          return (
            <article
              className={`random-date-card ${isSpinning ? "is-spinning" : ""}`}
              key={idea.id}
              aria-busy={isSpinning}
            >
              <div
                className={`random-date-photo-frame ${idea.image ? "" : "without-image"}`}
                role="img"
                aria-label={title}
                style={idea.image ? { backgroundImage: `url("${idea.image}")` } : undefined}
              >
                {!idea.image && (
                  <div className="random-date-photo-placeholder">
                    <MapPin size={24} aria-hidden="true" />
                    <span>{t("locationHoChiMinh")}</span>
                  </div>
                )}
              </div>

              <div className="random-date-body">
                <div className="random-date-mood-wrap">
                  <span className="random-date-mood" style={{ color: "var(--primary)" }}>
                    {t(isShared ? "sharedActivity" : "locationActivity")}
                    {!isShared && ` · ${t(location === "hanoi" ? "locationHanoi" : "locationHoChiMinh")}`}
                  </span>
                </div>

                <h3 className="random-date-title">{title}</h3>
                <p className="random-date-desc">{t(copy.description)}</p>

                <div className="random-date-tags">
                  <span className="random-date-tag">
                    <Clock3 size={12} aria-hidden="true" />
                    {t(copy.duration)}
                  </span>
                  <span className="random-date-tag">{t(copy.budget)}</span>
                </div>

                <button className="random-date-save-btn" onClick={showNotice}>
                  <Calendar size={14} />
                  {t("saveDateIdea")}
                </button>
              </div>
            </article>
          );
        })()}
      </div>
    </section>
  );
}
