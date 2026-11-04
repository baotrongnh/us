"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Calendar, Check, ChevronDown, Clock3, MapPin, Shuffle } from "lucide-react";
import randomDatesData from "@/data/random-dates.json";
import siteConfig from "@/data/site-config.json";
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
  cinema: {
    title: "cinemaDate",
    description: "cinemaDateDescription",
    duration: "cinemaDateDuration",
    budget: "cinemaDateBudget",
  },
  "home-movie": {
    title: "homeMovieDate",
    description: "homeMovieDateDescription",
    duration: "homeMovieDateDuration",
    budget: "homeMovieDateBudget",
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
  "nguyen-hue-walking-street": {
    title: "nguyenHueWalk",
    description: "nguyenHueWalkDescription",
    duration: "nguyenHueWalkDuration",
    budget: "freeActivity",
  },
};

const locations = ["hanoi", "ho-chi-minh"] as const;
type DateLocation = (typeof locations)[number];
function getDefaultLocation(): DateLocation {
  const configuredLocation = siteConfig.randomDate.defaultLocation;
  if (configuredLocation === "hanoi" || configuredLocation === "ho-chi-minh") {
    return configuredLocation;
  }
  throw new Error(`Invalid default Random Date location "${configuredLocation}" in site-config.json.`);
}
const defaultLocation = getDefaultLocation();

type DailyDateHistory = {
  date: string;
  usedIds: string[];
  lastId: string | null;
};

const DATE_HISTORY_KEY = "random-date-daily-history";
const DATE_HISTORY_EVENT = "random-date-history-change";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function subscribeToDateHistory(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(DATE_HISTORY_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(DATE_HISTORY_EVENT, onChange);
  };
}

function getLocalDateKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createEmptyHistory(): DailyDateHistory {
  return { date: getLocalDateKey(), usedIds: [], lastId: null };
}

function readDailyHistory(): DailyDateHistory | null {
  try {
    const stored = window.localStorage.getItem(DATE_HISTORY_KEY);
    if (!stored) return createEmptyHistory();

    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed) || parsed.date !== getLocalDateKey()) {
      return createEmptyHistory();
    }

    const usedIds = Array.isArray(parsed.usedIds)
      ? parsed.usedIds.filter((id: unknown): id is string => typeof id === "string")
      : [];
    const lastId = typeof parsed.lastId === "string" ? parsed.lastId : null;
    return { date: getLocalDateKey(), usedIds, lastId };
  } catch {
    return null;
  }
}

function saveDailyHistory(history: DailyDateHistory) {
  try {
    window.localStorage.setItem(DATE_HISTORY_KEY, JSON.stringify(history));
    window.dispatchEvent(new Event(DATE_HISTORY_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function RandomDatePanel() {
  const { t } = useLanguage();
  const [notice, setNotice] = useState<string | null>(null);
  const [location, setLocation] = useState<DateLocation>(defaultLocation);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [locationMenuLeft, setLocationMenuLeft] = useState<number | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinTimerRef = useRef<number | null>(null);
  const locationPickerRef = useRef<HTMLDivElement>(null);
  const locationTriggerRef = useRef<HTMLButtonElement>(null);
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const tickAudioContextRef = useRef<AudioContext | null>(null);
  const savedIdeaId = useSyncExternalStore(
    subscribeToDateHistory,
    () => readDailyHistory()?.lastId ?? null,
    () => null
  );

  const showNotice = () => {
    setNotice(t("savingComingSoon"));
    window.setTimeout(() => setNotice(null), 3000);
  };
  const ideas = randomDatesData.ideas.filter(
    (idea) => idea.location === "all" || idea.location === location
  );
  const selectedIdea =
    ideas.find((idea) => idea.id === selectedIdeaId) ??
    ideas.find((idea) => idea.id === savedIdeaId) ??
    ideas[0];

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) window.clearTimeout(spinTimerRef.current);
      if (tickAudioContextRef.current) {
        void tickAudioContextRef.current.close().catch((error: unknown) => {
          console.error("Could not close the date-picker audio context.", error);
        });
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!isLocationOpen) return;
    const positionMenu = () => {
      const picker = locationPickerRef.current;
      const trigger = locationTriggerRef.current;
      const menu = locationMenuRef.current;
      if (!picker || !trigger || !menu || window.innerWidth > 720) {
        setLocationMenuLeft(null);
        return;
      }

      const triggerBounds = trigger.getBoundingClientRect();
      const pickerBounds = picker.getBoundingClientRect();
      const menuWidth = menu.getBoundingClientRect().width;
      const left = Math.max(
        16,
        Math.min(triggerBounds.right - menuWidth, window.innerWidth - menuWidth - 16)
      );
      setLocationMenuLeft(left - pickerBounds.left);
    };

    positionMenu();
    const handleResize = () => positionMenu();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isLocationOpen, location]);

  useEffect(() => {
    if (!isLocationOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!locationPickerRef.current?.contains(event.target as Node)) {
        setIsLocationOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLocationOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLocationOpen]);

  const spinForIdea = () => {
    if (isSpinning || ideas.length < 2) return;

    const history = readDailyHistory();
    if (!history) setNotice(t("dateHistoryUnavailable"));

    let usedIds = (history?.usedIds ?? []).filter((id) =>
      randomDatesData.ideas.some((idea) => idea.id === id)
    );
    const previousId = history?.lastId ?? selectedIdea?.id ?? null;
    let availableIdeas = ideas.filter((idea) => !usedIds.includes(idea.id));
    if (availableIdeas.length === 0) {
      usedIds = [];
      availableIdeas = ideas;
    }
    if (availableIdeas.length > 1 && previousId) {
      availableIdeas = availableIdeas.filter((idea) => idea.id !== previousId);
    }

    const destinationIdea =
      availableIdeas[Math.floor(Math.random() * availableIdeas.length)];
    const destinationIndex = ideas.findIndex((idea) => idea.id === destinationIdea.id);
    setIsSpinning(true);
    const currentIndex = Math.max(0, ideas.findIndex((idea) => idea.id === selectedIdea?.id));
    const destinationOffset = (destinationIndex - currentIndex + ideas.length) % ideas.length;
    const totalSteps = ideas.length * 5 + destinationOffset;
    let remainingSteps = totalSteps;
    let step = 0;
    let audioContext = tickAudioContextRef.current;
    try {
      if (!audioContext && typeof window.AudioContext !== "undefined") {
        audioContext = new window.AudioContext();
        tickAudioContextRef.current = audioContext;
      }
      if (audioContext?.state === "suspended") {
        void audioContext.resume().catch((error: unknown) => {
          console.error("Could not start the date-picker sound.", error);
        });
      }
    } catch (error) {
      console.error("Could not initialize the date-picker sound.", error);
    }

    const advance = () => {
      step += 1;
      try {
        if (audioContext) {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          const now = audioContext.currentTime;
          oscillator.type = "square";
          oscillator.frequency.setValueAtTime(1150, now);
          gain.gain.setValueAtTime(0.045, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          oscillator.start(now);
          oscillator.stop(now + 0.04);
        }
      } catch (error) {
        console.error("Could not play the date-picker tick.", error);
      }

      const nextIndex = (currentIndex + step) % ideas.length;
      setSelectedIdeaId(ideas[nextIndex].id);
      remainingSteps -= 1;

      if (remainingSteps === 0) {
        setIsSpinning(false);
        spinTimerRef.current = null;
        const nextHistory = history ?? createEmptyHistory();
        nextHistory.usedIds = [...new Set([...usedIds, destinationIdea.id])];
        nextHistory.lastId = destinationIdea.id;
        if (!saveDailyHistory(nextHistory)) {
          setNotice(t("dateHistoryUnavailable"));
        }
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
    setLocationMenuLeft(null);
    setIsLocationOpen(false);
  };

  return (
    <section className="section-block random-date-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">{t("aLittleFreshAir")}</p>
          <h2>{t("randomDate")}</h2>
        </div>
        <div
          className={`theme-picker random-date-location ${isLocationOpen ? "open" : ""}`}
          ref={locationPickerRef}
        >
          <button
            type="button"
            className="theme-picker-trigger random-date-location-trigger"
            ref={locationTriggerRef}
            aria-label={`${t("location")}: ${t(location === "hanoi" ? "locationHanoi" : "locationHoChiMinh")}`}
            aria-haspopup="listbox"
            aria-expanded={isLocationOpen}
            onClick={() => setIsLocationOpen((open) => !open)}
          >
            <MapPin size={15} aria-hidden="true" />
            <span>{t("location")}</span>
            <strong>{t(location === "hanoi" ? "locationHanoi" : "locationHoChiMinh")}</strong>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {isLocationOpen && (
            <div
              className="theme-picker-menu random-date-location-menu"
              ref={locationMenuRef}
              style={locationMenuLeft === null ? undefined : { left: `${locationMenuLeft}px` }}
            >
              <p className="language-picker-label">{t("location")}</p>
              <div role="listbox" aria-label={t("location")}>
                {locations.map((item) => {
                  const isSelected = location === item;
                  return (
                    <button
                      type="button"
                      key={item}
                      role="option"
                      aria-selected={isSelected}
                      className={`theme-picker-option ${isSelected ? "selected" : ""}`}
                      onClick={() => selectLocation(item)}
                    >
                      <span>{t(item === "hanoi" ? "locationHanoi" : "locationHoChiMinh")}</span>
                      {isSelected && <Check size={15} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
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
              >
                {idea.image ? (
                  <Image
                    src={idea.image}
                    alt=""
                    fill
                    sizes="(max-width: 720px) calc(100vw - 64px), 150px"
                    quality={90}
                    loading="eager"
                    className="random-date-photo-image"
                  />
                ) : (
                  <div className="random-date-photo-placeholder">
                    <MapPin size={24} aria-hidden="true" />
                    <span>{t(location === "hanoi" ? "locationHanoi" : "locationHoChiMinh")}</span>
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
