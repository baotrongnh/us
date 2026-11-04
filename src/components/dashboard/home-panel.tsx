"use client";

import {
  addYears,
  differenceInCalendarDays,
  format,
  isBefore,
} from "date-fns";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CalendarDays, ChevronRight, RefreshCw, X } from "lucide-react";
import content from "@/data/relationship.json";
import memoriesData from "@/data/memories.json";
import quotesData from "@/data/quotes.json";
import upcomingEventsData from "@/data/upcoming-events.json";
import { LocationMapCard } from "@/components/dashboard/location-map-card";
import { useLanguage } from "@/components/dashboard/language-context";
import { formatLocalizedDate } from "@/lib/date-format";
import type { RecentItem } from "@/lib/types";
import type { MapLocation } from "@/lib/map-location";

type UpcomingEvent = {
  id: string;
  title: string;
  date: string;
  recurrence: "yearly" | "once";
  description?: string;
  progressStartDate?: string;
};

type UpcomingEventOccurrence = {
  event: UpcomingEvent;
  date: Date;
  daysUntil: number;
  progress: number | null;
};

function getGreeting(date: Date): "goodMorning" | "goodAfternoon" | "goodEvening" | "goodNight" {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "goodMorning";
  if (hour >= 12 && hour < 18) return "goodAfternoon";
  if (hour >= 18 && hour < 22) return "goodEvening";
  return "goodNight";
}

function parseEventDate(date: string, eventId: string): Date {
  const parsedDate = new Date(`${date}T00:00:00`);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    format(parsedDate, "yyyy-MM-dd") !== date
  ) {
    throw new Error(`Invalid date "${date}" for upcoming event "${eventId}".`);
  }
  return parsedDate;
}

function getUpcomingEvents(
  events: UpcomingEvent[],
  today: Date
): UpcomingEventOccurrence[] {
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return events
    .map((event) => {
      const eventDate = parseEventDate(event.date, event.id);
      let nextDate = eventDate;
      let progress: number | null = null;

      if (event.recurrence === "yearly") {
        nextDate = addYears(eventDate, todayStart.getFullYear() - eventDate.getFullYear());
        while (isBefore(nextDate, todayStart)) nextDate = addYears(nextDate, 1);
        const previousDate = addYears(nextDate, -1);
        const cycleDays = Math.max(1, differenceInCalendarDays(nextDate, previousDate));
        const elapsedDays = differenceInCalendarDays(todayStart, previousDate);
        progress = Math.min(100, Math.max(0, Math.round((elapsedDays / cycleDays) * 100)));
      } else {
        if (isBefore(eventDate, todayStart)) return null;
        if (event.progressStartDate) {
          const progressStart = parseEventDate(event.progressStartDate, event.id);
          const totalDays = Math.max(1, differenceInCalendarDays(eventDate, progressStart));
          const elapsedDays = differenceInCalendarDays(todayStart, progressStart);
          progress = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
        }
      }

      return {
        event,
        date: nextDate,
        daysUntil: differenceInCalendarDays(nextDate, todayStart),
        progress,
      };
    })
    .filter((occurrence): occurrence is UpcomingEventOccurrence => occurrence !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function AnimatedCount({
  value,
  active,
  onComplete,
}: {
  value: number;
  active: boolean;
  onComplete: () => void;
}) {
  const [displayedValue, setDisplayedValue] = useState(0);
  const displayedValueRef = useRef(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!active) {
      hasAnimated.current = false;
      displayedValueRef.current = value;
      return;
    }

    const startValue = hasAnimated.current ? displayedValueRef.current : 0;
    const startTime = performance.now();
    const duration = 1400;
    hasAnimated.current = true;

    let frame = 0;
    function animate(now: number) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - (1 - progress) ** 4;
      const nextValue = Math.round(startValue + (value - startValue) * eased);
      displayedValueRef.current = nextValue;
      setDisplayedValue(nextValue);
      if (progress < 1) frame = requestAnimationFrame(animate);
      else onComplete();
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active, onComplete, value]);

  return <>{active ? displayedValue : value}</>;
}

export function HomePanel({
  mapLocations,
  recentItems,
  onOpenImage,
  onNavigate,
  animateCounter,
  onCounterAnimationComplete,
}: {
  mapLocations: MapLocation[];
  recentItems: RecentItem[];
  onOpenImage: (source: string, title: string) => void;
  onNavigate: (section: "memories") => void;
  animateCounter: boolean;
  onCounterAnimationComplete: () => void;
}) {
  const { t, locale, language } = useLanguage();
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const nextMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    ).getTime();
    const timer = window.setTimeout(
      () => setToday(new Date()),
      Math.max(1000, nextMidnight - today.getTime())
    );
    return () => window.clearTimeout(timer);
  }, [today]);

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const relationshipStart = new Date(`${content.relationship.startDate}T00:00:00`);
  const daysTogether = Math.max(0, differenceInCalendarDays(today, relationshipStart));
  const thisAnniversary = addYears(
    relationshipStart,
    today.getFullYear() - relationshipStart.getFullYear()
  );
  const nextAnniversary = isBefore(thisAnniversary, todayStart)
    ? addYears(thisAnniversary, 1)
    : thisAnniversary;
  const daysInAnniversaryCycle = Math.max(
    1,
    differenceInCalendarDays(nextAnniversary, thisAnniversary)
  );
  const daysIntoAnniversaryCycle = Math.min(
    daysInAnniversaryCycle,
    Math.max(0, differenceInCalendarDays(todayStart, thisAnniversary))
  );
  const anniversaryProgress =
    (daysIntoAnniversaryCycle / daysInAnniversaryCycle) * 100;
  const upcomingEvents = getUpcomingEvents(
    upcomingEventsData.events as UpcomingEvent[],
    today
  );
  const nextEvent = upcomingEvents[0] ?? null;
  const translateEventTitle = (title: string) =>
    title === "Our anniversary" ? t("anniversary") : title;
  const translateEventDescription = (event: UpcomingEvent) =>
    event.id === "anniversary"
      ? t("anniversaryDescription")
      : event.description ?? t("everyDayCloser");

  const [reminderIndex, setReminderIndex] = useState(0);
  const [isUpcomingModalOpen, setIsUpcomingModalOpen] = useState(false);

  useEffect(() => {
    if (!isUpcomingModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsUpcomingModalOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isUpcomingModalOpen]);

  const reminders = quotesData.map((quote) => quote[language]);

  const pickAnotherReminder = () => {
    setReminderIndex((current) => (current + 1) % reminders.length);
  };

  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">{t(getGreeting(today))}</p>
          <h1>
            {content.relationship.firstPerson}{" "}
            <span>&amp;</span>{" "}
            {content.relationship.secondPerson}
          </h1>
          <p className="subtitle">{t("tagline")}</p>
        </div>
      </section>

      <section className="feature-grid" aria-label={t("relationshipOverview")}>
        <article className="together-card">
          <p className="eyebrow">{t("ourLittleNumber")}</p>
          <div className="count-number">
            <AnimatedCount
              value={daysTogether}
              active={animateCounter}
              onComplete={onCounterAnimationComplete}
            />
          </div>
          <h2>{t("daysTogether")}</h2>
          <p className="muted-copy">
            {t("since")} {formatLocalizedDate(relationshipStart, locale, { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <div
            className="counter-line"
            role="progressbar"
            aria-label={t("relationshipOverview")}
            aria-valuemin={0}
            aria-valuemax={daysInAnniversaryCycle}
            aria-valuenow={daysIntoAnniversaryCycle}
          >
            {Array.from({ length: 8 }).map((_, i) => {
              const barProgress = Math.max(
                0,
                Math.min(100, (anniversaryProgress * 8) - i * 100)
              );
              return (
                <span
                  key={i}
                  className={barProgress > 0 ? "filled" : undefined}
                  style={{
                    "--bar-index": i,
                    "--bar-progress": `${barProgress}%`,
                  } as CSSProperties}
                />
              );
            })}
          </div>
          <p className="tiny-copy">{t("counterNote")}</p>
        </article>

        <article className="upcoming-card">
          <div className="upcoming-title">
            <div>
              <p className="eyebrow">{t("comingUp")}</p>
              <h2>{nextEvent ? translateEventTitle(nextEvent.event.title) : t("nothingComingUp")}</h2>
            </div>
            <CalendarDays size={21} />
          </div>
          {nextEvent ? (
            <>
              <div className="anniversary-info">
                <div className="date-tile">
                  <span>{formatLocalizedDate(nextEvent.date, locale, { month: "short" })}</span>
                  <strong>{format(nextEvent.date, "d")}</strong>
                </div>
                <div>
                  <p>
                    <strong>
                      {nextEvent.daysUntil === 0 ? t("today") : `${nextEvent.daysUntil} ${t("daysToGo")}`}
                    </strong>
                  </p>
                  <span>{formatLocalizedDate(nextEvent.date, locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
                </div>
                <span className="anniversary-heart" aria-hidden="true">♡</span>
              </div>
              {nextEvent.progress !== null && (
                <div className="anniversary-progress">
                  <div className="anniversary-progress-heading">
                    <span>{t("aLittleCloser")}</span>
                    <strong>{nextEvent.progress}%</strong>
                  </div>
                  <div
                    className="anniversary-progress-track"
                    role="progressbar"
                    aria-label={`${t("aLittleCloser")}: ${translateEventTitle(nextEvent.event.title)}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={nextEvent.progress}
                  >
                    <span style={{ width: `${nextEvent.progress}%` }} />
                  </div>
                  <span className="anniversary-progress-note">
                    {translateEventDescription(nextEvent.event)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="upcoming-empty-copy">{t("addEventConfig")}</p>
          )}
          <button
            type="button"
            className="upcoming-view-all"
            onClick={() => setIsUpcomingModalOpen(true)}
          >
            {t("viewAllEvents")} <ChevronRight size={14} />
          </button>
        </article>
      </section>

      {isUpcomingModalOpen && createPortal(
        <div
          className="ui-modal-backdrop upcoming-events-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={t("allUpcomingEvents")}
          onMouseDown={() => setIsUpcomingModalOpen(false)}
        >
          <section
            className="ui-modal-surface upcoming-events-modal"
            aria-labelledby="upcoming-events-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="upcoming-events-heading">
              <div>
                <p className="eyebrow">{t("datesWorthRemembering")}</p>
                <h2 id="upcoming-events-title">{t("allUpcomingEvents")}</h2>
              </div>
              <button
                type="button"
                className="ui-modal-close"
                aria-label={t("close")}
                onClick={() => setIsUpcomingModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="upcoming-events-list">
                {upcomingEvents.map(({ event, date, daysUntil }) => (
                  <article className="upcoming-event-item" key={event.id}>
                    <div className="date-tile">
                      <span>{formatLocalizedDate(date, locale, { month: "short" })}</span>
                      <strong>{format(date, "d")}</strong>
                    </div>
                    <div>
                      <h3>{translateEventTitle(event.title)}</h3>
                      <p>
                        {formatLocalizedDate(date, locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                        {event.recurrence === "yearly" ? ` · ${t("everyYear")}` : ""}
                      </p>
                      {(event.description || event.id === "anniversary") && <span>{translateEventDescription(event)}</span>}
                    </div>
                    <strong className="upcoming-event-days">
                      {daysUntil === 0 ? t("today") : `${daysUntil}d`}
                    </strong>
                  </article>
                ))}
              </div>
            ) : (
              <p className="upcoming-empty-copy">{t("noUpcomingEvents")}</p>
            )}
          </section>
        </div>,
        document.body
      )}

      <section className="lower-grid">
        <article className="featured-memory">
          <div
            className="featured-photo"
            style={{
              backgroundImage: `linear-gradient(0deg, rgba(31,18,15,.28), transparent 45%), url('${content.images.featured}')`,
            }}
          >
            <span>{memoriesData.featuredMemory.dateLabel}</span>
          </div>
          <div className="featured-caption">
            <div>
              <p className="eyebrow">{t("lastWeekend")}</p>
              <h2>
                {[t("featuredCaptionLine1"), t("featuredCaptionLine2")].map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </h2>
            </div>
            <button
              aria-label="Open latest memory"
              className="circle-arrow"
              onClick={() => onOpenImage(content.images.featured, `${t("featuredCaptionLine1")} ${t("featuredCaptionLine2")}`)}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </article>
        <LocationMapCard locations={mapLocations} />
      </section>

      <section className="section-block recently-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">{t("recentEyebrow")}</p>
            <h2>{t("recently")}</h2>
          </div>
          <button className="text-button" onClick={() => onNavigate("memories")}>
            {t("viewAll")} <ChevronRight size={16} />
          </button>
        </div>
        <div className="recent-grid home-recent-grid">
          {recentItems.slice(0, 3).map((item, idx) => (
            <article key={`${item.title}-${idx}`} className="recent-card memory-card">
              <button
                type="button"
                className="recent-image-button"
                onClick={() => onOpenImage(item.image ?? "", item.title)}
                aria-label={`${t("viewPhoto")}: ${item.title}`}
              >
                <div
                  aria-hidden="true"
                  className="mini-image"
                  style={{ backgroundImage: `url('${item.image ?? ""}')` }}
                />
                <span className="image-view-hint">{t("viewPhoto")}</span>
              </button>
              <div className="recent-card-copy">
                <p className="card-kind">
                  {t("memoryLabel")} <span>•</span> {item.dateLabel}
                </p>
                <h3>{item.title}</h3>
                <p className="card-meta">{item.meta}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <article className="quote-card quote-card-interactive">
        <span className="quote-mark" aria-hidden="true">“</span>
        <div className="quote-card-copy" key={reminderIndex}>
          <p>{reminders[reminderIndex].text}</p>
          <span className="quote-source">— {reminders[reminderIndex].source}</span>
        </div>
        <button type="button" className="quote-refresh" onClick={pickAnotherReminder}>
          <RefreshCw size={14} />
          <span>{t("anotherReminder")}</span>
        </button>
      </article>

      <footer>{t("footer")}</footer>
    </>
  );
}
