"use client";

import {
  Bell,
  BookHeart,
  Check,
  Download,
  House,
  ImageIcon,
  Palette,
  Rocket,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import content from "@/data/relationship.json";
import memoriesData from "@/data/memories.json";
import { MusicPlayer } from "@/components/dashboard/music-player";
import { MusicProvider } from "@/components/dashboard/music-context";
import { WelcomeCountdown } from "@/components/dashboard/welcome-countdown";
import { MemoriesSection } from "@/components/dashboard/memories-section";
import { HomePanel } from "@/components/dashboard/home-panel";
import { LettersPanel } from "@/components/dashboard/letters-panel";
import { RandomDatePanel } from "@/components/dashboard/random-date-panel";
import { ComingSoonPanel } from "@/components/dashboard/coming-soon-panel";
import { FeatureTour } from "@/components/dashboard/feature-tour";
import { LanguagePicker } from "@/components/dashboard/language-picker";
import siteConfig from "@/data/site-config.json";
import { LanguageProvider, useLanguage, type TranslationKey } from "@/components/dashboard/language-context";
import { formatLocalizedDate } from "@/lib/date-format";
import type { RecentItem } from "@/lib/types";
import type { MapLocation } from "@/lib/map-location";
import type { SiteNotification } from "@/lib/site-notification";

// ── Types ────────────────────────────────────────────────────────────────────

type Theme = "pastel-pink" | "midnight" | "blue-pastel";
type Section = "home" | "memories" | "randomDate" | "letters" | "comingSoon";

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
  comingSoon: Rocket,
};

const navigationItems: { icon: string; label: TranslationKey; section: Section }[] = [
  { icon: "home", label: "home", section: "home" },
  { icon: "memories", label: "memories", section: "memories" },
  { icon: "randomDate", label: "randomDate", section: "randomDate" },
  { icon: "letters", label: "letters", section: "letters" },
  { icon: "comingSoon", label: "comingSoon", section: "comingSoon" },
];
const notificationsSeenStorageKey = "ours-notifications-seen-at";

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
    <div className={`theme-picker ${isOpen ? "open" : ""}`} ref={pickerRef} data-tour="theme">
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

// ── Mobile Bottom Nav ─────────────────────────────────────────────────────────

const bottomNavItems: { key: Section; icon: LucideIcon }[] = [
  { key: "home", icon: House },
  { key: "memories", icon: ImageIcon },
  { key: "randomDate", icon: Sparkles },
  { key: "letters", icon: BookHeart },
  { key: "comingSoon", icon: Rocket },
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
    comingSoon: t("comingSoon"),
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
        <div className="brand-mark">ours<span>.</span></div>
        <button
          className="mobile-close icon-button"
          onClick={onClose}
          aria-label={t("close")}
        >
          <X size={19} />
        </button>
      </div>

      <nav aria-label={t("yourSpace")} className="side-nav">
        <p className="nav-heading">{t("yourSpace")}</p>
        {navigationItems.map((item) => (
          <NavItem
            key={item.section}
            label={t(item.label)}
            icon={item.icon}
            active={activeSection === item.section}
            onClick={() => {
              onNavigate(item.section);
              onClose?.();
            }}
          />
        ))}
      </nav>
    </aside>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

function DashboardContent({
  mapLocations,
  initialNotifications,
}: {
  mapLocations: MapLocation[];
  initialNotifications: SiteNotification[];
}) {
  const { t, locale } = useLanguage();
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "pastel-pink";
    const saved = window.localStorage.getItem("relationship-theme");
    return saved && themes.some((option) => option.id === saved) ? (saved as Theme) : "pastel-pink";
  });
  const [navOpen, setNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("home");
  const [isTourReady, setIsTourReady] = useState(!siteConfig.welcomeModal.enabled);
  const [counterAnimationActive, setCounterAnimationActive] = useState(!siteConfig.welcomeModal.enabled);
  const [notice, setNotice] = useState("");
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [notificationsSeenAt, setNotificationsSeenAt] = useState(0);
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
  const dismissWelcome = useCallback(() => {
    setCounterAnimationActive(true);
    setIsTourReady(true);
  }, []);
  const finishCounterAnimation = useCallback(() => setCounterAnimationActive(false), []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const savedStateTimer = window.setTimeout(() => {
      try {
        const savedSeenAt = Number(window.localStorage.getItem(notificationsSeenStorageKey));
        if (Number.isFinite(savedSeenAt) && savedSeenAt > 0) setNotificationsSeenAt(savedSeenAt);
      } catch (error) {
        console.error("Could not read notification view state from local storage.", error);
      }
    }, 0);

    let active = true;
    const refreshNotifications = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        const data = (await response.json()) as {
          notifications?: SiteNotification[];
          error?: string;
        };
        if (!response.ok || !Array.isArray(data.notifications)) {
          throw new Error(data.error ?? "Could not load notifications.");
        }
        if (active) setNotifications(data.notifications);
      } catch (error) {
        console.error("Could not refresh notifications.", error);
      }
    };

    void refreshNotifications();
    const interval = window.setInterval(() => void refreshNotifications(), 60_000);
    return () => {
      active = false;
      window.clearTimeout(savedStateTimer);
      window.clearInterval(interval);
    };
  }, []);

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

  const openNotifications = () => {
    setIsNotificationsOpen(true);
    const newestNotificationTime = notifications.reduce(
      (latest, notification) => Math.max(latest, Date.parse(notification.createdAt) || 0),
      0
    );
    const seenAt = Math.max(Date.now(), newestNotificationTime);
    setNotificationsSeenAt(seenAt);
    try {
      window.localStorage.setItem(notificationsSeenStorageKey, String(seenAt));
    } catch (error) {
      console.error("Could not save notification view state to local storage.", error);
    }
  };

  const hasUnreadNotifications = notifications.some(
    (notification) => Date.parse(notification.createdAt) > notificationsSeenAt
  );

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

  const navigate = useCallback((section: Section) => {
    setActiveSection(section);
    setNavOpen(false);
  }, []);

  return (
    <MusicProvider>
    <div className="app-shell" data-theme={theme}>
      {/* Welcome countdown modal */}
      <WelcomeCountdown onDismiss={dismissWelcome} />
      <FeatureTour
        ready={isTourReady}
        activeSection={activeSection}
        onNavigate={navigate}
      />

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
            aria-describedby={notifications.length === 0 ? "notifications-empty-message" : undefined}
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
            {notifications.length > 0 ? (
              <div className="notifications-list">
                {notifications.map((notification) => (
                  <article className="notification-item" key={notification.id}>
                    <span className="notification-item-icon" aria-hidden="true">
                      <Bell size={17} />
                    </span>
                    <div>
                      <h3>{notification.title}</h3>
                      <p>{notification.message}</p>
                      <time dateTime={notification.createdAt}>
                        {new Date(notification.createdAt).toLocaleString(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="notifications-empty-state">
                <span className="notifications-empty-icon" aria-hidden="true">
                  <Bell size={20} />
                </span>
                <p id="notifications-empty-message">{t("noNewNotifications")}</p>
              </div>
            )}
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
                data-tour="notifications"
                aria-label={t("notifications")}
                aria-haspopup="dialog"
                aria-expanded={isNotificationsOpen}
                aria-controls="notifications-dialog"
                onClick={openNotifications}
              >
                <Bell size={17} />
                {hasUnreadNotifications && <span className="notification-unread-dot" aria-hidden="true" />}
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
              mapLocations={mapLocations}
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

          {activeSection === "comingSoon" && <ComingSoonPanel />}
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

export function OursDashboard({
  mapLocations,
  initialNotifications,
}: {
  mapLocations: MapLocation[];
  initialNotifications: SiteNotification[];
}) {
  return (
    <LanguageProvider>
      <DashboardContent
        mapLocations={mapLocations}
        initialNotifications={initialNotifications}
      />
    </LanguageProvider>
  );
}
