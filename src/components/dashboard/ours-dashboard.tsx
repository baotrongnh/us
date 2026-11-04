"use client";

import {
  addYears,
  differenceInCalendarDays,
  format,
  isBefore,
} from "date-fns";
import {
  Bell,
  BookHeart,
  CalendarDays,
  Check,
  ChevronRight,
  Download,
  House,
  ImageIcon,
  Mic,
  MoreHorizontal,
  Palette,
  RefreshCw,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import content from "@/data/relationship.json";
import memoriesData from "@/data/memories.json";
import randomDatesData from "@/data/random-dates.json";
import upcomingEventsData from "@/data/upcoming-events.json";
import { MusicPlayer } from "@/components/dashboard/music-player";
import { MusicProvider } from "@/components/dashboard/music-context";
import { WelcomeCountdown } from "@/components/dashboard/welcome-countdown";
import { MemoriesSection } from "@/components/dashboard/memories-section";
import { LettersPanel } from "@/components/dashboard/letters-panel";
import { RandomDatePanel } from "@/components/dashboard/random-date-panel";
import { WhispersPanel } from "@/components/dashboard/whispers-panel";
import welcomeConfig from "@/data/welcome-modal.json";
import { LanguageProvider, useLanguage, type Language, type TranslationKey } from "@/components/dashboard/language-context";

// ── Types ────────────────────────────────────────────────────────────────────

type Theme = "pastel-pink" | "midnight" | "blue-pastel";
type Section = "home" | "memories" | "randomDate" | "letters" | "whispers";

type RecentItem = {
  kind: "memory" | "date" | "letter";
  label: string;
  dateLabel: string;
  title: string;
  meta: string;
  image?: string;
  previewGreeting?: string;
  previewLines?: string[];
};

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

// ── Theme config ─────────────────────────────────────────────────────────────

const themes: { id: Theme; label: string; colors: [string, string, string] }[] = [
  { id: "pastel-pink", label: "Pastel pink",  colors: ["#fff9fb", "#f3a6b8", "#f1dde2"] },
  { id: "midnight",   label: "Midnight",      colors: ["#10131a", "#f0a8c0", "#394153"] },
  { id: "blue-pastel", label: "Blue pastel",  colors: ["#f0f4ff", "#7baff5", "#c8d9f8"] },
];
const themeLabelKeys: Record<Theme, TranslationKey> = {
  "pastel-pink": "themePastel",
  midnight: "themeMidnight",
  "blue-pastel": "themeBlue",
};

const navIcons: Record<string, LucideIcon> = {
  home: House,
  memories: ImageIcon,
  randomDate: Sparkles,
  letters: BookHeart,
  whispers: Mic,
};

const sectionMap: Record<string, Section> = {
  home: "home",
  memories: "memories",
  randomDate: "randomDate",
  letters: "letters",
  whispers: "whispers",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning,";
  if (hour >= 12 && hour < 18) return "Good afternoon,";
  if (hour >= 18 && hour < 22) return "Good evening,";
  return "Good night,";
}

function formatLocalizedDate(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

type MapLocation = {
  id: string;
  gender: "male" | "female";
  coords: [number, number];
};

const mapLocations: MapLocation[] = (randomDatesData.map?.locations ?? []).map((location) => {
  const [latitude, longitude] = location.coords;
  if (
    (location.gender !== "male" && location.gender !== "female") ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error(`Invalid map location "${location.id}" in random-dates.json.`);
  }

  return {
    id: location.id,
    gender: location.gender,
    coords: [latitude, longitude] as [number, number],
  };
});

const LocationMapBody = dynamic(
  async () => {
    const [{ MapContainer, Marker, TileLayer, useMap }, { divIcon, latLngBounds }] = await Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]);

    function FitMapToLocations({ locations }: { locations: MapLocation[] }) {
      const map = useMap();

      useEffect(() => {
        if (locations.length === 0) return;
        const bounds = latLngBounds(locations.map((location) => location.coords));
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 6, animate: false });
      }, [locations, map]);

      return null;
    }

    return function LocationMapBodyInner({
      markerData,
      tileUrl,
      mapAttribution,
    }: {
      markerData: MapLocation[];
      tileUrl: string;
      mapAttribution: string;
    }) {
      const markerIcon = (gender: "male" | "female") =>
        divIcon({
          className: "date-map-pin-wrapper",
          html: `<div class="date-map-pin is-${gender}"><span></span></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

      return (
        <MapContainer
          center={[15.87, 108.32]}
          zoom={5}
          scrollWheelZoom
          className="date-map-instance"
        >
          <TileLayer url={tileUrl} attribution={mapAttribution} />
          <FitMapToLocations locations={markerData} />
          {markerData.map((marker) => (
            <Marker
              key={marker.id}
              position={marker.coords}
              icon={markerIcon(marker.gender)}
            />
          ))}
        </MapContainer>
      );
    };
  },
  { ssr: false }
);

function LocationMapCard() {
  const { t } = useLanguage();
  const mapData = randomDatesData.map;
  const markerData = mapLocations;
  const vietmapApiKey = process.env.NEXT_PUBLIC_VIETMAP_KEY;

  const tileUrl = vietmapApiKey
    ? `https://maps.vietmap.vn/maps/tiles/st/{z}/{x}/{y}.png?apikey=${encodeURIComponent(vietmapApiKey)}`
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const mapAttribution = vietmapApiKey
    ? '&copy; <a href="https://vietmap.vn/">VietMap</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

  return (
    <article className="location-map-card">
      <div className="date-map-pane" aria-label={t("whereWeAre")}>
        <LocationMapBody
          markerData={markerData}
          tileUrl={tileUrl}
          mapAttribution={mapAttribution}
        />
      </div>
    </article>
  );
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

// ── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const Icon = navIcons[icon] ?? House;
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      <Icon size={18} strokeWidth={1.75} />
      <span>{label}</span>
    </button>
  );
}

function ThemePicker({
  theme,
  onSelect,
}: {
  theme: Theme;
  onSelect: (theme: Theme) => void;
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedTheme = themes.find((option) => option.id === theme) ?? themes[0];
  const selectedColor = selectedTheme.colors[1];

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`theme-picker ${isOpen ? "open" : ""}`} ref={pickerRef}>
      <button
        type="button"
        className="theme-picker-trigger"
        style={{ "--picker-theme-color": selectedColor } as React.CSSProperties}
        aria-label={`${t("chooseTheme")}: ${t(themeLabelKeys[selectedTheme.id])}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Palette size={17} />
      </button>
      {isOpen && (
        <div className="theme-picker-menu" role="listbox" aria-label="Choose a theme">
          {themes.map((option) => (
            <button
              type="button"
              key={option.id}
              role="option"
              aria-selected={theme === option.id}
              className={`theme-picker-option ${theme === option.id ? "selected" : ""}`}
              onClick={() => {
                onSelect(option.id);
                setIsOpen(false);
              }}
            >
              <span>{t(themeLabelKeys[option.id])}</span>
              {theme === option.id && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const languageOptions: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "de", label: "Deutsch" },
];

function LanguageFlag({ language }: { language: Language }) {
  const flagContent: Record<Language, React.ReactNode> = {
    en: (
      <>
        <path fill="#eee" d="M0 0h512v512H0z" />
        <path fill="#d80027" d="M0 0h512v40H0zm0 80h512v40H0zm0 80h512v40H0zm0 80h512v40H0zm0 80h512v40H0zm0 80h512v40H0zm0 80h512v32H0z" />
        <path fill="#0052b4" d="M0 0h256v256H0z" />
        <path fill="#eee" d="m45 38 7 15h16L55 63l5 16-15-10-15 10 5-16-13-10h16zm62 0 7 15h16l-13 10 5 16-15-10-15 10 5-16-13-10h16zm62 0 7 15h16l-13 10 5 16-15-10-15 10 5-16-13-10h16zM45 115l7 15h16l-13 10 5 16-15-10-15 10 5-16-13-10h16zm62 0 7 15h16l-13 10 5 16-15-10-15 10 5-16-13-10h16zm62 0 7 15h16l-13 10 5 16-15-10-15 10 5-16-13-10h16z" />
      </>
    ),
    vi: (
      <>
        <path fill="#d80027" d="M0 0h512v512H0z" />
        <path fill="#ffda44" d="m256 110 34 104h110l-89 64 34 104-89-64-89 64 34-104-89-64h110z" />
      </>
    ),
    ja: (
      <>
        <path fill="#eee" d="M0 0h512v512H0z" />
        <circle cx="256" cy="256" r="112" fill="#d80027" />
      </>
    ),
    zh: (
      <>
        <path fill="#d80027" d="M0 0h512v512H0z" />
        <path fill="#ffda44" d="m130 90 18 54h57l-46 34 18 54-47-34-46 34 18-54-46-34h57zm125 20 8 24h25l-20 15 8 24-21-15-20 15 8-24-20-15h25zm58 53 8 24h25l-20 15 8 24-21-15-20 15 8-24-20-15h25zm-2 78 8 24h25l-20 15 8 24-21-15-20 15 8-24-20-15h25zm-56 55 8 24h25l-20 15 8 24-21-15-20 15 8-24-20-15h25z" />
      </>
    ),
    de: (
      <>
        <path fill="#222" d="M0 0h512v171H0z" />
        <path fill="#d80027" d="M0 171h512v170H0z" />
        <path fill="#ffda44" d="M0 341h512v171H0z" />
      </>
    ),
  };

  return (
    <span className="language-flag" aria-hidden="true">
      <svg viewBox="0 0 512 512">{flagContent[language]}</svg>
    </span>
  );
}

function LanguagePicker() {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`theme-picker language-picker ${isOpen ? "open" : ""}`} ref={pickerRef}>
      <button
        type="button"
        className="theme-picker-trigger language-picker-trigger"
        aria-label={t("chooseLanguage")}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <LanguageFlag language={language} />
      </button>
      {isOpen && (
        <div className="theme-picker-menu language-picker-menu" role="listbox" aria-label={t("chooseLanguage")}>
          <p className="language-picker-label">{t("language")}</p>
          {languageOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              role="option"
              aria-selected={language === option.value}
              className={`theme-picker-option ${language === option.value ? "selected" : ""}`}
              onClick={() => {
                setLanguage(option.value);
                setIsOpen(false);
              }}
            >
              <LanguageFlag language={option.value} />
              <span>{option.label}</span>
              {language === option.value && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mobile Bottom Nav ─────────────────────────────────────────────────────────

const bottomNavItems: { key: Section; label: string; icon: LucideIcon }[] = [
  { key: "home",       label: "Home",    icon: House },
  { key: "memories",   label: "Memories",icon: ImageIcon },
  { key: "randomDate", label: "Date",    icon: Sparkles },
  { key: "letters",    label: "Letters", icon: BookHeart },
  { key: "whispers",   label: "Whispers",icon: Mic },
];

function MobileBottomNav({
  activeSection,
  onNavigate,
}: {
  activeSection: Section;
  onNavigate: (section: Section) => void;
}) {
  const { t } = useLanguage();
  const labels: Record<Section, string> = {
    home: t("home"),
    memories: t("memories"),
    randomDate: t("date"),
    letters: t("letters"),
    whispers: t("whispers"),
  };
  return (
    <nav className="mobile-bottom-nav" aria-label={t("yourSpace")}>
      {bottomNavItems.map(({ key, icon: Icon }) => (
        <button
          key={key}
          className={`mobile-bottom-nav-item ${activeSection === key ? "active" : ""}`}
          onClick={() => onNavigate(key)}
          aria-label={labels[key]}
        >
          <Icon size={22} strokeWidth={1.75} />
          <span>{labels[key]}</span>
        </button>
      ))}
    </nav>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  activeSection,
  onNavigate,
  onClose,
}: {
  activeSection: Section;
  onNavigate: (section: Section) => void;
  onClose?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand-mark">
          {content.brand.name.slice(0, -1)}<span>.</span>
        </div>
        <button
          className="mobile-close icon-button"
          onClick={onClose}
          aria-label={t("close")}
        >
          <X size={19} />
        </button>
      </div>

      <nav aria-label={t("yourSpace")} className="side-nav">
        {content.navigation.map((group) => (
          <div key={group.title}>
            <p className="nav-heading">{t("yourSpace")}</p>
            {group.items.map((item) => {
              const section = sectionMap[item.icon] ?? "home";
              return (
                <NavItem
                  key={item.label}
                  label={item.icon === "randomDate" ? t("randomDate") : t(item.icon as "home" | "memories" | "letters" | "whispers")}
                  icon={item.icon}
                  active={activeSection === section}
                  onClick={() => {
                    onNavigate(section);
                    onClose?.();
                  }}
                />
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="profile-card">
          <div className="avatar">{content.relationship.profileInitial}</div>
          <div>
            <strong>{content.relationship.profileName}</strong>
            <span>{t("withThanh")}</span>
          </div>
          <MoreHorizontal size={18} />
        </div>
      </div>
    </aside>
  );
}

// ── Home Panel ───────────────────────────────────────────────────────────────

function HomePanel({
  recentItems,
  onOpenImage,
  onNavigate,
  animateCounter,
  onCounterAnimationComplete,
}: {
  recentItems: RecentItem[];
  onOpenImage: (source: string, title: string) => void;
  onNavigate: (section: Section) => void;
  animateCounter: boolean;
  onCounterAnimationComplete: () => void;
}) {
  const { t, locale } = useLanguage();
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
  const greetingKey = {
    "Good morning,": "goodMorning",
    "Good afternoon,": "goodAfternoon",
    "Good evening,": "goodEvening",
    "Good night,": "goodNight",
  }[getGreeting(today)] as "goodMorning" | "goodAfternoon" | "goodEvening" | "goodNight";
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

  const reminders = [
    { text: t("quoteText"), source: t("quoteSource") },
    { text: t("quoteTwo"), source: t("quoteSource") },
    { text: t("quoteThree"), source: t("quoteSource") },
    { text: t("quoteFour"), source: t("quoteSource") },
  ];

  const pickAnotherReminder = () => {
    setReminderIndex((current) => (current + 1) % reminders.length);
  };

  return (
    <>
      {/* Welcome row */}
      <section className="welcome-row">
        <div>
          <p className="eyebrow">{t(greetingKey)}</p>
          <h1>
            {content.relationship.firstPerson}{" "}
            <span>&amp;</span>{" "}
            {content.relationship.secondPerson}
          </h1>
          <p className="subtitle">{t("tagline")}</p>
        </div>
      </section>

      {/* Feature grid */}
      <section
        className="feature-grid"
        aria-label={t("relationshipOverview")}
      >
        {/* Days together */}
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
                  } as React.CSSProperties}
                />
              );
            })}
          </div>
          <p className="tiny-copy">{t("counterNote")}</p>
        </article>

        {/* Upcoming event */}
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

      {isUpcomingModalOpen && (
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
        </div>
      )}

      {/* Memory and date idea bento */}
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
        <LocationMapCard />
      </section>

      {/* Recently */}
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
            <article key={`${item.kind}-${idx}`} className="recent-card memory-card">
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

// ── Main Dashboard ───────────────────────────────────────────────────────────

function DashboardContent() {
  const { t, locale } = useLanguage();
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "pastel-pink";
    const saved = window.localStorage.getItem("relationship-theme");
    return saved && themes.some((option) => option.id === saved) ? (saved as Theme) : "pastel-pink";
  });
  const [navOpen, setNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("home");
  const [counterAnimationActive, setCounterAnimationActive] = useState(!welcomeConfig.enabled);
  const [notice, setNotice] = useState("");
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [memoryTitle, setMemoryTitle] = useState("");
  const [memoryLocation, setMemoryLocation] = useState("");
  const [recentItems, setRecentItems] = useState<RecentItem[]>(
    () => memoriesData.recentItems as RecentItem[]
  );
  const [imagePreview, setImagePreview] = useState<{
    source: string;
    title: string;
  } | null>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const dismissWelcome = useCallback(() => setCounterAnimationActive(true), []);
  const finishCounterAnimation = useCallback(() => setCounterAnimationActive(false), []);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsNotificationsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isNotificationsOpen]);

  const today = new Date();

  const selectTheme = (next: Theme) => {
    setTheme(next);
    window.localStorage.setItem("relationship-theme", next);
  };

  const showToast = (msg: string, duration = 2800) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), duration);
  };

  const downloadPreviewImage = async () => {
    if (!imagePreview || isDownloadingImage) return;
    setIsDownloadingImage(true);
    try {
      const response = await fetch(imagePreview.source);
      if (!response.ok) throw new Error("The image could not be downloaded.");
      const imageBlob = await response.blob();
      const objectUrl = URL.createObjectURL(imageBlob);
      const link = document.createElement("a");
      const safeTitle = imagePreview.title
        .trim()
        .replace(/[<>:"/\\|?*]+/g, "-")
        .replace(/\s+/g, "-");
      const extension = imageBlob.type.startsWith("image/")
        ? imageBlob.type.split("/")[1].split("+")[0]
        : imagePreview.source.split(/[?#]/)[0].split(".").pop() || "jpg";
      link.href = objectUrl;
      link.download = `${safeTitle || "memory"}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      showToast(t("imageDownloadFailed"));
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const saveMemory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = memoryTitle.trim();
    if (!title) return;
    const newMemory: RecentItem = {
      kind: "memory",
      label: t("memoryLabel"),
      dateLabel: formatLocalizedDate(today, locale, { day: "2-digit", month: "short" }).toUpperCase(),
      title,
      meta: memoryLocation.trim() || t("addPlaceOptional"),
      image: content.images.featured,
    };
    setRecentItems((items) => [newMemory, ...items].slice(0, 6));
    setMemoryTitle("");
    setMemoryLocation("");
    setIsMemoryDialogOpen(false);
    showToast(t("memorySavedUi"));
  };

  const navigate = (section: Section) => {
    setActiveSection(section);
    setNavOpen(false);
  };

  return (
    <MusicProvider>
    <div className="app-shell" data-theme={theme}>
      {/* Welcome countdown modal */}
      <WelcomeCountdown onDismiss={dismissWelcome} />

      {isNotificationsOpen && (
        <div
          className="ui-modal-backdrop notifications-modal-backdrop"
          role="presentation"
          onMouseDown={() => setIsNotificationsOpen(false)}
        >
          <section
            className="ui-modal-surface notifications-dialog"
            role="dialog"
            aria-modal="true"
            id="notifications-dialog"
            aria-labelledby="notifications-title"
            aria-describedby="notifications-empty-message"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="ui-modal-close"
              onClick={() => setIsNotificationsOpen(false)}
              aria-label={t("close")}
            >
              <X size={18} />
            </button>
            <p className="eyebrow">{t("notifications")}</p>
            <h2 id="notifications-title">{t("notifications")}</h2>
            <div className="notifications-empty-state">
              <span className="notifications-empty-icon" aria-hidden="true">
                <Bell size={20} />
              </span>
              <p id="notifications-empty-message">{t("noNewNotifications")}</p>
            </div>
          </section>
        </div>
      )}

      {/* Desktop sidebar */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={navigate}
      />

      {/* Mobile sidebar overlay (kept for accessibility/fallback) */}
      {navOpen && (
        <div className="mobile-sidebar">
          <Sidebar
            activeSection={activeSection}
            onNavigate={navigate}
            onClose={() => setNavOpen(false)}
          />
        </div>
      )}

      {/* Main content */}
      <main className="content">
        {/* Top bar */}
        <header className="topbar">
          <p>{formatLocalizedDate(today, locale, { weekday: "long", day: "numeric", month: "long" })}</p>
          <div className="top-actions">
            <MusicPlayer />
            <div className="top-controls">
              <LanguagePicker />
              <ThemePicker theme={theme} onSelect={selectTheme} />
              <button
                type="button"
                className="theme-picker-trigger notification-trigger"
                aria-label={t("notifications")}
                aria-haspopup="dialog"
                aria-expanded={isNotificationsOpen}
                aria-controls="notifications-dialog"
                onClick={() => setIsNotificationsOpen(true)}
              >
                <Bell size={17} />
              </button>
            </div>
          </div>
        </header>

        {/* Sections — key triggers CSS slide-up animation on change */}
        <div
          key={activeSection}
          className="section-panel"
        >
          {activeSection === "home" && (
            <HomePanel
              recentItems={recentItems}
              onOpenImage={(source, title) => setImagePreview({ source, title })}
              onNavigate={navigate}
              animateCounter={counterAnimationActive}
              onCounterAnimationComplete={finishCounterAnimation}
            />
          )}

          {activeSection === "memories" && (
            <MemoriesSection
              onOpenImage={(source, title) => setImagePreview({ source, title })}
              onAddMemory={() => setIsMemoryDialogOpen(true)}
            />
          )}

          {activeSection === "randomDate" && <RandomDatePanel />}

          {activeSection === "letters" && <LettersPanel />}

          {activeSection === "whispers" && <WhispersPanel />}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <MobileBottomNav activeSection={activeSection} onNavigate={navigate} />

      {/* Image lightbox */}
      {imagePreview && (
        <div
          className="ui-modal-backdrop image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={imagePreview.title}
          onMouseDown={() => setImagePreview(null)}
        >
          <div className="ui-modal-surface ui-modal-lightbox lightbox-content" onMouseDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ui-modal-close lightbox-close"
              onClick={() => setImagePreview(null)}
              aria-label={t("closePhoto")}
            >
              <X size={19} />
            </button>
            <div className="lightbox-heading">
              <span>{t("aMomentToKeep")}</span>
              <p className="lightbox-title">{imagePreview.title}</p>
            </div>
            {/* Native image sizing lets the lightbox follow each photo's intrinsic ratio. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lightbox-image" src={imagePreview.source} alt={imagePreview.title} />
            <button
              type="button"
              className="lightbox-download"
              onClick={downloadPreviewImage}
              disabled={isDownloadingImage}
              aria-label={t("downloadImage")}
              title={t("downloadImage")}
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Add memory dialog */}
      {isMemoryDialogOpen && (
        <div
          className="ui-modal-backdrop memory-dialog-backdrop"
          role="presentation"
          onMouseDown={() => setIsMemoryDialogOpen(false)}
        >
          <form
            className="ui-modal-surface memory-dialog"
            onSubmit={saveMemory}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">{t("memoryDialogEyebrow")}</p>
                <h2>{t("memoryDialogTitle")}</h2>
              </div>
              <button
                type="button"
                className="ui-modal-close dialog-close"
                onClick={() => setIsMemoryDialogOpen(false)}
                aria-label={t("close")}
              >
                <X size={18} />
              </button>
            </div>
            <label>
              {t("whatHappened")}
              <input
                autoFocus
                required
                value={memoryTitle}
                onChange={(e) => setMemoryTitle(e.target.value)}
                placeholder={t("memoryTitlePlaceholder")}
              />
            </label>
            <label>
              {t("whereWereYou")}
              <input
                value={memoryLocation}
                onChange={(e) => setMemoryLocation(e.target.value)}
                placeholder={t("addPlaceOptional")}
              />
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="dialog-cancel"
                onClick={() => setIsMemoryDialogOpen(false)}
              >
                {t("cancel")}
              </button>
              <button type="submit" className="dialog-save">
                {t("saveMemory")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toast */}
      {notice && (
        <div role="status" className="toast">
          {notice}
        </div>
      )}
    </div>
    </MusicProvider>
  );
}

export function OursDashboard() {
  return (
    <LanguageProvider>
      <DashboardContent />
    </LanguageProvider>
  );
}
