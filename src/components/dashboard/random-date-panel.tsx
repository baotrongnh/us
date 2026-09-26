"use client";

import { useState } from "react";
import { Wrench, RefreshCw, Sparkles, AlertCircle } from "lucide-react";
import randomDatesData from "@/data/random-dates.json";

type Idea = (typeof randomDatesData.ideas)[number];

const moodColors: Record<string, string> = {
  cozy: "#f3a6b8",
  romantic: "#e88fa5",
  fun: "#91a68e",
  calm: "#7baff5",
  creative: "#b8a0e0",
};

const moodLabels: Record<string, string> = {
  cozy: "Cozy",
  romantic: "Romantic",
  fun: "Fun",
  calm: "Calm",
  creative: "Creative",
};

export function RandomDatePanel() {
  const [current, setCurrent] = useState<Idea>(() => {
    const idx = Math.floor(Math.random() * randomDatesData.ideas.length);
    return randomDatesData.ideas[idx];
  });
  const [spinning, setSpinning] = useState(false);
  const [devNotice, setDevNotice] = useState<string | null>(null);

  const showDevMessage = (msg = "This feature is currently under development 🛠️") => {
    setDevNotice(msg);
    setTimeout(() => setDevNotice(null), 3000);
  };

  const pickRandom = () => {
    setSpinning(true);
    showDevMessage("Random date generator is under development 🛠️");
    const others = randomDatesData.ideas.filter((i) => i.id !== current.id);
    const next = others[Math.floor(Math.random() * others.length)];
    setTimeout(() => {
      setCurrent(next);
      setSpinning(false);
    }, 400);
  };

  const selectIdea = (idea: Idea) => {
    setSpinning(true);
    showDevMessage(`"${idea.title}" feature is under development 🛠️`);
    setTimeout(() => {
      setCurrent(idea);
      setSpinning(false);
    }, 250);
  };

  const moodColor = moodColors[current.mood] ?? "var(--primary)";

  return (
    <section className="section-block random-date-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Not sure where to go?</p>
          <h2>Random Date</h2>
        </div>
        <div className="random-date-dev-badge">
          <Wrench size={14} />
          <span>Under Development</span>
        </div>
      </div>

      {devNotice && (
        <div role="status" className="random-date-toast">
          <AlertCircle size={16} />
          <span>{devNotice}</span>
        </div>
      )}

      <div
        className={`random-date-card ${spinning ? "spinning" : ""}`}
        onClick={() => showDevMessage(`"${current.title}" feature is under development 🛠️`)}
        title="Click to view — Feature under development"
        style={{ cursor: "pointer" }}
      >
        <div
          className="random-date-emoji"
          style={{ background: `${moodColor}22`, color: moodColor }}
        >
          {current.emoji}
        </div>

        <div className="random-date-body">
          <div className="random-date-mood-wrap">
            <span className="random-date-mood" style={{ color: moodColor }}>
              {moodLabels[current.mood] ?? current.mood}
            </span>
            <span className="random-date-tag-dev">Feature under development</span>
          </div>

          <h3 className="random-date-title">{current.title}</h3>
          <p className="random-date-desc">{current.description}</p>

          <div className="random-date-tags">
            <span className="random-date-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              {current.duration}
            </span>
            <span className="random-date-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              {current.budget}
            </span>
          </div>
        </div>
      </div>

      <button
        className="random-date-spin-btn"
        onClick={pickRandom}
        disabled={spinning}
      >
        <RefreshCw size={16} className={spinning ? "spin-anim" : ""} />
        Pick another
      </button>

      <div className="random-date-all-title">All ideas</div>
      <div className="random-date-all-grid">
        {randomDatesData.ideas.map((idea) => (
          <button
            key={idea.id}
            className={`random-date-all-item ${idea.id === current.id ? "active" : ""}`}
            onClick={() => selectIdea(idea)}
          >
            <span className="random-date-all-emoji">{idea.emoji}</span>
            <span>{idea.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
