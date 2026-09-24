"use client";

import { addYears, differenceInCalendarDays, format, isBefore } from "date-fns";
import { Bell, BookHeart, CalendarDays, ChevronLeft, ChevronRight, Clock3, House, ImageIcon, MapPin, Menu, MoreHorizontal, Pause, Play, Plus, Sparkles, X, type LucideIcon } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import content from "@/data/relationship.json";

type Theme = "pastel-pink" | "midnight" | "ivory" | "sage";
type RecentItem = { kind: "memory" | "date" | "letter"; label: string; dateLabel: string; title: string; meta: string; image?: string; previewGreeting?: string; previewLines?: string[] };

const themes: { id: Theme; label: string; colors: [string, string, string] }[] = [
  { id: "pastel-pink", label: "Pastel pink", colors: ["#fff9fb", "#f3a6b8", "#f1dde2"] },
  { id: "midnight", label: "Midnight", colors: ["#0a0a0b", "#d9a1af", "#29292d"] },
  { id: "ivory", label: "Ivory", colors: ["#f8f5ef", "#b8898f", "#ded8cf"] },
  { id: "sage", label: "Sage", colors: ["#f7f9f5", "#91a68e", "#dce4d9"] },
];

const navIcons: Record<string, LucideIcon> = {
  home: House, memories: ImageIcon, randomDate: Sparkles, letters: BookHeart,
};

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "pastel-pink";
  const savedTheme = window.localStorage.getItem("relationship-theme");
  return themes.some((theme) => theme.id === savedTheme) ? savedTheme as Theme : "pastel-pink";
}

function NavItem({ label, icon, active }: { label: string; icon: string; active?: boolean }) {
  const Icon = navIcons[icon] ?? House;
  return <button className={`nav-item ${active ? "active" : ""}`}><Icon size={18} strokeWidth={1.75} /><span>{label}</span></button>;
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  return <aside className="sidebar">
    <div className="sidebar-top"><div className="brand-mark">{content.brand.name.slice(0, -1)}<span>.</span></div><button className="mobile-close icon-button" onClick={onClose} aria-label="Close navigation"><X size={19} /></button></div>
    <nav aria-label="Main navigation" className="side-nav">{content.navigation.map((group) => <div key={group.title}><p className="nav-heading">{group.title}</p>{group.items.map((item) => <NavItem key={item.label} {...item} />)}</div>)}</nav>
    <div className="sidebar-footer"><div className="profile-card"><div className="avatar">{content.relationship.profileInitial}</div><div><strong>{content.relationship.profileName}</strong><span>{content.relationship.profileSubtitle}</span></div><MoreHorizontal size={18} /></div></div>
  </aside>;
}

function RecentCard({ item, onOpenImage }: { item: RecentItem; onOpenImage: (source: string, title: string) => void }) {
  const cardKind = <p className="card-kind">{item.label} <span>•</span> {item.dateLabel}</p>;
  if (item.kind === "memory") return <article className="recent-card memory-card"><button type="button" className="recent-image-button" onClick={() => onOpenImage(item.image ?? "", item.title)} aria-label={`Open photo: ${item.title}`}><div aria-hidden="true" className="mini-image" style={{ backgroundImage: `url('${item.image ?? ""}')` }} /><span className="image-view-hint">View photo</span></button><div className="recent-card-copy">{cardKind}<h3>{item.title}</h3><p className="card-meta"><MapPin size={14} /> {item.meta}</p></div></article>;
  if (item.kind === "date") return <article className="recent-card date-card"><div className="line-art"><Sparkles size={24} /></div><div className="recent-card-copy">{cardKind}<h3>{item.title}</h3><p className="card-meta"><Clock3 size={14} /> {item.meta}</p></div></article>;
  return <article className="recent-card letter-card"><div className="paper-preview"><span>{item.previewGreeting}</span><i>{item.previewLines?.map((line: string) => <span key={line}>{line}</span>)}</i></div><div className="recent-card-copy">{cardKind}<h3>{item.title}</h3><p className="card-meta"><BookHeart size={14} /> {item.meta}</p></div></article>;
}

function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try { await audio.play(); setIsPlaying(true); } catch { setIsPlaying(false); }
    } else { audio.pause(); setIsPlaying(false); }
  };
  return <div className="music-player">
    <audio ref={audioRef} src={content.music.source} preload="metadata" autoPlay onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} />
    <button className={`music-toggle ${isPlaying ? "playing" : ""}`} onClick={togglePlayback} aria-label={isPlaying ? "Pause music" : "Play music"} title={isPlaying ? "Pause music" : "Play music"}>{isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</button>
    <div className="music-copy"><strong>{content.music.title}</strong><span>{content.music.artist}</span></div>
  </div>;
}

export function OursDashboard() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [navOpen, setNavOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [memoryTitle, setMemoryTitle] = useState("");
  const [memoryLocation, setMemoryLocation] = useState("");
  const [recentItems, setRecentItems] = useState<RecentItem[]>(() => content.recentItems as RecentItem[]);
  const [activeRecentIndex, setActiveRecentIndex] = useState(0);
  const [imagePreview, setImagePreview] = useState<{ source: string; title: string } | null>(null);
  const recentCarouselRef = useRef<HTMLDivElement>(null);
  const relationshipStart = new Date(`${content.relationship.startDate}T00:00:00`);
  const today = new Date();
  const daysTogether = Math.max(0, differenceInCalendarDays(today, relationshipStart));
  const thisAnniversary = addYears(relationshipStart, today.getFullYear() - relationshipStart.getFullYear());
  const nextAnniversary = isBefore(thisAnniversary, today) ? addYears(thisAnniversary, 1) : thisAnniversary;
  const anniversaryDays = differenceInCalendarDays(nextAnniversary, today);
  const selectTheme = (nextTheme: Theme) => { setTheme(nextTheme); window.localStorage.setItem("relationship-theme", nextTheme); };
  const addMemory = () => setIsMemoryDialogOpen(true);
  const saveMemory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = memoryTitle.trim();
    if (!title) return;
    const newMemory: RecentItem = { kind: "memory", label: "MEMORY", dateLabel: format(today, "dd MMM").toUpperCase(), title, meta: memoryLocation.trim() || content.labels.memoryLocationPlaceholder, image: content.images.featured };
    setRecentItems((items) => [newMemory, ...items].slice(0, 3));
    setMemoryTitle("");
    setMemoryLocation("");
    setIsMemoryDialogOpen(false);
    setNotice(content.labels.memorySavedNotice);
    window.setTimeout(() => setNotice(""), 2500);
  };
  const scrollRecent = (direction: "previous" | "next") => recentCarouselRef.current?.scrollBy({ left: (direction === "next" ? 1 : -1) * recentCarouselRef.current.clientWidth * 0.86, behavior: "smooth" });
  const updateRecentSlide = () => {
    const carousel = recentCarouselRef.current;
    if (!carousel) return;
    const cards = Array.from(carousel.children) as HTMLElement[];
    const nearestCard = cards.reduce((closest, card, index) => Math.abs(card.offsetLeft - carousel.scrollLeft) < Math.abs(cards[closest].offsetLeft - carousel.scrollLeft) ? index : closest, 0);
    setActiveRecentIndex(nearestCard);
  };

  return <div className="app-shell" data-theme={theme}>
    <Sidebar />
    <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setNavOpen(true)}><Menu size={20} /></button>
    {navOpen && <div className="mobile-sidebar"><Sidebar onClose={() => setNavOpen(false)} /></div>}
    <main className="content">
      <header className="topbar"><p>{format(today, content.labels.currentDateFormat)}</p><div className="top-actions"><MusicPlayer /><div className="theme-picker" aria-label="Theme selection">{themes.map((option) => <button key={option.id} aria-label={`Switch to ${option.label} theme`} className={`theme-dot ${theme === option.id ? "selected" : ""}`} onClick={() => selectTheme(option.id)} style={{ "--theme-bg": option.colors[0], "--theme-primary": option.colors[1], "--theme-border": option.colors[2] } as React.CSSProperties} />)}</div><button className="icon-button" aria-label="Notifications"><Bell size={19} /></button></div></header>
      <section className="welcome-row"><div><p className="eyebrow">{content.labels.greeting}</p><h1>{content.relationship.firstPerson} <span>&amp;</span> {content.relationship.secondPerson}</h1><p className="subtitle">{content.brand.tagline}</p></div><button className="add-memory" onClick={addMemory}><Plus size={18} /> {content.labels.addMemory}</button></section>
      <section className="feature-grid" aria-label="Relationship overview"><article className="featured-memory"><div className="featured-photo" style={{ backgroundImage: `linear-gradient(0deg, rgba(31,18,15,.28), transparent 45%), url('${content.images.featured}')` }}><span>{content.featuredMemory.dateLabel}</span></div><div className="featured-caption"><div><p className="eyebrow">{content.labels.lastWeekend}</p><h2>{content.featuredMemory.captionLines.map((line) => <span key={line}>{line}<br /></span>)}</h2></div><button aria-label="Open latest memory" className="circle-arrow"><ChevronRight size={20} /></button></div></article><article className="together-card"><p className="eyebrow">{content.labels.counterLabel}</p><div className="count-number">{daysTogether}</div><h2>{content.labels.daysTogether}</h2><p className="muted-copy">{content.labels.since} {format(relationshipStart, "MMMM d, yyyy")}</p><div className="counter-line">{Array.from({ length: 8 }).map((_, index) => <span key={index} />)}</div><p className="tiny-copy">{content.labels.counterNote}</p></article></section>
      <section className="section-block recently-section"><div className="section-header"><div><p className="eyebrow">{content.labels.recentEyebrow}</p><h2>{content.labels.recentTitle}</h2></div><button className="text-button">{content.labels.viewAll} <ChevronRight size={16} /></button></div><div className="recent-carousel"><div className="recent-grid" ref={recentCarouselRef} onScroll={updateRecentSlide}>{recentItems.map((item, index) => <RecentCard key={`${item.kind}-${item.title}-${index}`} item={item} onOpenImage={(source, title) => setImagePreview({ source, title })} />)}</div>{recentItems.length > 1 && <div className="carousel-controls"><button type="button" aria-label="Previous recent item" onClick={() => scrollRecent("previous")}><ChevronLeft size={17} /></button><span>{activeRecentIndex + 1} <i>/</i> {recentItems.length}</span><button type="button" aria-label="Next recent item" onClick={() => scrollRecent("next")}><ChevronRight size={17} /></button></div>}</div></section>
      <section className="lower-grid"><article className="upcoming-card"><div className="upcoming-title"><div><p className="eyebrow">{content.labels.comingUp}</p><h2>{content.labels.anniversaryTitle}</h2></div><CalendarDays size={21} /></div><div className="anniversary-info"><div className="date-tile"><span>{format(nextAnniversary, "MMM")}</span><strong>{format(nextAnniversary, "d")}</strong></div><div><p><strong>{anniversaryDays} days</strong> {content.labels.daysToGo}</p><span>{format(nextAnniversary, "EEEE, MMMM d, yyyy")}</span></div><button aria-label="View anniversary"><ChevronRight size={18} /></button></div></article><article className="quote-card"><span className="quote-mark">“</span><p>{content.quote.text}</p><span className="quote-source">— {content.quote.source}</span></article></section>
      <footer>{content.labels.footer}</footer>
    </main>
    {imagePreview && <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={imagePreview.title} onMouseDown={() => setImagePreview(null)}><div className="lightbox-content" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="lightbox-close" onClick={() => setImagePreview(null)} aria-label="Close photo"><X size={19} /></button><div className="lightbox-image" role="img" aria-label={imagePreview.title} style={{ backgroundImage: `url('${imagePreview.source}')` }} /><p>{imagePreview.title}</p></div></div>}
    {isMemoryDialogOpen && <div className="memory-dialog-backdrop" role="presentation" onMouseDown={() => setIsMemoryDialogOpen(false)}><form className="memory-dialog" onSubmit={saveMemory} onMouseDown={(event) => event.stopPropagation()}><div className="dialog-heading"><div><p className="eyebrow">A moment for later</p><h2>{content.labels.memoryDialogTitle}</h2></div><button type="button" className="dialog-close" onClick={() => setIsMemoryDialogOpen(false)} aria-label="Close add memory dialog"><X size={18} /></button></div><label>{content.labels.memoryTitleLabel}<input autoFocus required value={memoryTitle} onChange={(event) => setMemoryTitle(event.target.value)} placeholder={content.labels.memoryTitlePlaceholder} /></label><label>{content.labels.memoryLocationLabel}<input value={memoryLocation} onChange={(event) => setMemoryLocation(event.target.value)} placeholder={content.labels.memoryLocationPlaceholder} /></label><div className="dialog-actions"><button type="button" className="dialog-cancel" onClick={() => setIsMemoryDialogOpen(false)}>{content.labels.cancel}</button><button type="submit" className="dialog-save">{content.labels.saveMemory}</button></div></form></div>}
    {notice && <div role="status" className="toast">{notice}</div>}
  </div>;
}
