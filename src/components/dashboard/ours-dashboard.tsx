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
  ChevronRight,
  House,
  ImageIcon,
  Menu,
  MoreHorizontal,
  Plus,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import content from "@/data/relationship.json";
import memoriesData from "@/data/memories.json";
import { MusicPlayer } from "@/components/dashboard/music-player";
import { WelcomeCountdown } from "@/components/dashboard/welcome-countdown";
import { MemoriesSection } from "@/components/dashboard/memories-section";
import { LettersPanel } from "@/components/dashboard/letters-panel";
import { RandomDatePanel } from "@/components/dashboard/random-date-panel";

// ── Types ────────────────────────────────────────────────────────────────────

type Theme = "pastel-pink" | "midnight" | "blue-pastel";
type Section = "home" | "memories" | "randomDate" | "letters";

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

// ── Theme config ─────────────────────────────────────────────────────────────

const themes: { id: Theme; label: string; colors: [string, string, string] }[] = [
  { id: "pastel-pink", label: "Pastel pink",  colors: ["#fff9fb", "#f3a6b8", "#f1dde2"] },
  { id: "midnight",   label: "Midnight",      colors: ["#0a0a0b", "#d9a1af", "#29292d"] },
  { id: "blue-pastel", label: "Blue pastel",  colors: ["#f0f4ff", "#7baff5", "#c8d9f8"] },
];

const navIcons: Record<string, LucideIcon> = {
  home: House,
  memories: ImageIcon,
  randomDate: Sparkles,
  letters: BookHeart,
};

const sectionMap: Record<string, Section> = {
  home: "home",
  memories: "memories",
  randomDate: "randomDate",
  letters: "letters",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning,";
  if (hour >= 12 && hour < 18) return "Good afternoon,";
  if (hour >= 18 && hour < 22) return "Good evening,";
  return "Good night,";
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
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand-mark">
          {content.brand.name.slice(0, -1)}<span>.</span>
        </div>
        <button
          className="mobile-close icon-button"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={19} />
        </button>
      </div>

      <nav aria-label="Main navigation" className="side-nav">
        {content.navigation.map((group) => (
          <div key={group.title}>
            <p className="nav-heading">{group.title}</p>
            {group.items.map((item) => {
              const section = sectionMap[item.icon] ?? "home";
              return (
                <NavItem
                  key={item.label}
                  label={item.label}
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
            <span>{content.relationship.profileSubtitle}</span>
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
  onAddMemory,
  onOpenImage,
}: {
  recentItems: RecentItem[];
  onAddMemory: () => void;
  onOpenImage: (source: string, title: string) => void;
}) {
  const today = new Date();
  const greeting = getGreeting(today);
  const relationshipStart = new Date(`${content.relationship.startDate}T00:00:00`);
  const daysTogether = Math.max(0, differenceInCalendarDays(today, relationshipStart));
  const thisAnniversary = addYears(
    relationshipStart,
    today.getFullYear() - relationshipStart.getFullYear()
  );
  const nextAnniversary = isBefore(thisAnniversary, today)
    ? addYears(thisAnniversary, 1)
    : thisAnniversary;
  const anniversaryDays = differenceInCalendarDays(nextAnniversary, today);

  return (
    <>
      {/* Welcome row */}
      <section className="welcome-row">
        <div>
          <p className="eyebrow">{greeting}</p>
          <h1>
            {content.relationship.firstPerson}{" "}
            <span>&amp;</span>{" "}
            {content.relationship.secondPerson}
          </h1>
          <p className="subtitle">{content.brand.tagline}</p>
        </div>
        <button className="add-memory" onClick={onAddMemory}>
          <Plus size={18} /> {content.labels.addMemory}
        </button>
      </section>

      {/* Feature grid */}
      <section className="feature-grid" aria-label="Relationship overview">
        {/* Featured memory */}
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
              <p className="eyebrow">{content.labels.lastWeekend}</p>
              <h2>
                {memoriesData.featuredMemory.captionLines.map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </h2>
            </div>
            <button aria-label="Open latest memory" className="circle-arrow">
              <ChevronRight size={20} />
            </button>
          </div>
        </article>

        {/* Days together */}
        <article className="together-card">
          <p className="eyebrow">{content.labels.counterLabel}</p>
          <div className="count-number">{daysTogether}</div>
          <h2>{content.labels.daysTogether}</h2>
          <p className="muted-copy">
            {content.labels.since} {format(relationshipStart, "MMMM d, yyyy")}
          </p>
          <div className="counter-line">
            {Array.from({ length: 8 }).map((_, i) => <span key={i} />)}
          </div>
          <p className="tiny-copy">{content.labels.counterNote}</p>
        </article>
      </section>

      {/* Recently */}
      <section className="section-block recently-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">{content.labels.recentEyebrow}</p>
            <h2>{content.labels.recentTitle}</h2>
          </div>
          <button className="text-button">
            {content.labels.viewAll} <ChevronRight size={16} />
          </button>
        </div>
        <div className="recent-grid home-recent-grid">
          {recentItems.slice(0, 3).map((item, idx) => (
            <article key={`${item.kind}-${idx}`} className="recent-card memory-card">
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
                <span className="image-view-hint">View photo</span>
              </button>
              <div className="recent-card-copy">
                <p className="card-kind">
                  {item.label} <span>•</span> {item.dateLabel}
                </p>
                <h3>{item.title}</h3>
                <p className="card-meta">{item.meta}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Lower grid */}
      <section className="lower-grid">
        <article className="upcoming-card">
          <div className="upcoming-title">
            <div>
              <p className="eyebrow">{content.labels.comingUp}</p>
              <h2>{content.labels.anniversaryTitle}</h2>
            </div>
            <CalendarDays size={21} />
          </div>
          <div className="anniversary-info">
            <div className="date-tile">
              <span>{format(nextAnniversary, "MMM")}</span>
              <strong>{format(nextAnniversary, "d")}</strong>
            </div>
            <div>
              <p>
                <strong>{anniversaryDays} days</strong> {content.labels.daysToGo}
              </p>
              <span>{format(nextAnniversary, "EEEE, MMMM d, yyyy")}</span>
            </div>
            <button aria-label="View anniversary">
              <ChevronRight size={18} />
            </button>
          </div>
        </article>

        <article className="quote-card">
          <span className="quote-mark">"</span>
          <p>{content.quote.text}</p>
          <span className="quote-source">— {content.quote.source}</span>
        </article>
      </section>

      <footer>{content.labels.footer}</footer>
    </>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export function OursDashboard() {
  const [theme, setTheme] = useState<Theme>("pastel-pink");
  const [navOpen, setNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("home");
  const [notice, setNotice] = useState("");
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [memoryTitle, setMemoryTitle] = useState("");
  const [memoryLocation, setMemoryLocation] = useState("");
  const [recentItems, setRecentItems] = useState<RecentItem[]>(
    () => memoriesData.recentItems as RecentItem[]
  );
  const [imagePreview, setImagePreview] = useState<{
    source: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("relationship-theme");
    if (saved && themes.some((t) => t.id === saved)) {
      setTheme(saved as Theme);
    }
  }, []);

  const today = new Date();

  const selectTheme = (next: Theme) => {
    setTheme(next);
    window.localStorage.setItem("relationship-theme", next);
  };

  const saveMemory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = memoryTitle.trim();
    if (!title) return;
    const newMemory: RecentItem = {
      kind: "memory",
      label: "MEMORY",
      dateLabel: format(today, "dd MMM").toUpperCase(),
      title,
      meta: memoryLocation.trim() || content.labels.memoryLocationPlaceholder,
      image: content.images.featured,
    };
    setRecentItems((items) => [newMemory, ...items].slice(0, 6));
    setMemoryTitle("");
    setMemoryLocation("");
    setIsMemoryDialogOpen(false);
    setNotice(content.labels.memorySavedNotice);
    window.setTimeout(() => setNotice(""), 2500);
  };

  return (
    <div className="app-shell" data-theme={theme}>
      {/* Welcome countdown modal */}
      <WelcomeCountdown />

      {/* Desktop sidebar */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
      />

      {/* Mobile menu button */}
      <button
        className="mobile-menu icon-button"
        aria-label="Open navigation"
        onClick={() => setNavOpen(true)}
      >
        <Menu size={20} />
      </button>

      {/* Mobile sidebar overlay */}
      {navOpen && (
        <div className="mobile-sidebar">
          <Sidebar
            activeSection={activeSection}
            onNavigate={setActiveSection}
            onClose={() => setNavOpen(false)}
          />
        </div>
      )}

      {/* Main content */}
      <main className="content">
        {/* Top bar */}
        <header className="topbar">
          <p>{format(today, content.labels.currentDateFormat)}</p>
          <div className="top-actions">
            <MusicPlayer />
            <div className="theme-picker" aria-label="Theme selection">
              {themes.map((option) => (
                <button
                  key={option.id}
                  aria-label={`Switch to ${option.label} theme`}
                  className={`theme-dot ${theme === option.id ? "selected" : ""}`}
                  onClick={() => selectTheme(option.id)}
                  style={
                    {
                      "--theme-bg": option.colors[0],
                      "--theme-primary": option.colors[1],
                      "--theme-border": option.colors[2],
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={19} />
            </button>
          </div>
        </header>

        {/* Sections */}
        {activeSection === "home" && (
          <HomePanel
            recentItems={recentItems}
            onAddMemory={() => setIsMemoryDialogOpen(true)}
            onOpenImage={(source, title) => setImagePreview({ source, title })}
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
      </main>

      {/* Image lightbox */}
      {imagePreview && (
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={imagePreview.title}
          onMouseDown={() => setImagePreview(null)}
        >
          <div className="lightbox-content" onMouseDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setImagePreview(null)}
              aria-label="Close photo"
            >
              <X size={19} />
            </button>
            <div
              className="lightbox-image"
              role="img"
              aria-label={imagePreview.title}
              style={{ backgroundImage: `url('${imagePreview.source}')` }}
            />
            <p>{imagePreview.title}</p>
          </div>
        </div>
      )}

      {/* Add memory dialog */}
      {isMemoryDialogOpen && (
        <div
          className="memory-dialog-backdrop"
          role="presentation"
          onMouseDown={() => setIsMemoryDialogOpen(false)}
        >
          <form
            className="memory-dialog"
            onSubmit={saveMemory}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">A moment for later</p>
                <h2>{content.labels.memoryDialogTitle}</h2>
              </div>
              <button
                type="button"
                className="dialog-close"
                onClick={() => setIsMemoryDialogOpen(false)}
                aria-label="Close add memory dialog"
              >
                <X size={18} />
              </button>
            </div>
            <label>
              {content.labels.memoryTitleLabel}
              <input
                autoFocus
                required
                value={memoryTitle}
                onChange={(e) => setMemoryTitle(e.target.value)}
                placeholder={content.labels.memoryTitlePlaceholder}
              />
            </label>
            <label>
              {content.labels.memoryLocationLabel}
              <input
                value={memoryLocation}
                onChange={(e) => setMemoryLocation(e.target.value)}
                placeholder={content.labels.memoryLocationPlaceholder}
              />
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="dialog-cancel"
                onClick={() => setIsMemoryDialogOpen(false)}
              >
                {content.labels.cancel}
              </button>
              <button type="submit" className="dialog-save">
                {content.labels.saveMemory}
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
  );
}
