"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookHeart,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Lock,
  MapPin,
  Maximize2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import lettersData from "@/data/letters.json";

type Letter = (typeof lettersData.letters)[number];

function cleanVietnameseText(str: string): string {
  if (!str) return "";
  let text = str.normalize("NFC");
  // Remove space between vowel/consonant and combining accent mark
  text = text.replace(/([a-zA-ZăâêôơưĂÂÊÔƠƯ])\s+([\u0300\u0301\u0303\u0309\u0323])/g, "$1$2");
  text = text.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
  return text.normalize("NFC");
}

function getLetterImages(letter: Letter): string[] {
  if ("images" in letter && Array.isArray(letter.images) && letter.images.length > 0) {
    return letter.images;
  }
  if ("imageUrl" in letter && typeof letter.imageUrl === "string" && letter.imageUrl) {
    return [letter.imageUrl];
  }
  return [];
}

function getLetterPreview(letter: Letter) {
  const fullTextClean = cleanVietnameseText(letter.fullText || "");
  const lines = fullTextClean.split("\n").map((l) => l.trim()).filter(Boolean);

  const greeting = lines[0] || cleanVietnameseText(letter.title) || "Gửi em,";

  let snippetLines: string[] = [];
  if (lines.length > 1) {
    snippetLines = lines.slice(1, 3);
  } else {
    const sentences = fullTextClean.split(/(?<=[.!?])\s+/).filter(Boolean);
    snippetLines = sentences.slice(0, 2);
  }

  const formattedLines = snippetLines.map((l) =>
    l.length > 65 ? l.slice(0, 62) + "..." : l
  );

  return {
    greeting: greeting.length > 45 ? greeting.slice(0, 42) + "..." : greeting,
    lines: formattedLines.length > 0 ? formattedLines : ["Nội dung lá thư..."],
  };
}

// ── Section Password Gate ────────────────────────────────────────────────────

function SectionPasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [shaking, setShaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const checkCode = (nextDigits: string[]) => {
    if (nextDigits.some((d) => d === "")) return;
    const code = nextDigits.join("");
    if (code === lettersData.password) {
      onSuccess();
    } else {
      setShaking(true);
      setErrorMsg("Incorrect code. Try again.");
      setTimeout(() => {
        setDigits(["", "", "", "", "", ""]);
        setShaking(false);
        setErrorMsg("");
        inputRefs.current[0]?.focus();
      }, 650);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    checkCode(next);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
  };

  return (
    <div className="letters-gate">
      <div className="letters-gate-inner">
        <div className="letters-gate-icon" aria-hidden="true">
          <Lock size={26} />
        </div>
        <h2 className="letters-gate-title">Letters</h2>
        <p className="letters-gate-sub">
          Enter your 6-digit code to read your letters.
        </p>
        <div className={`pin-row ${shaking ? "pin-shake" : ""}`}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              id={`gate-pin-${i}`}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`pin-input ${d ? "pin-filled" : ""}`}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>
        {errorMsg && <p className="pin-error-msg">{errorMsg}</p>}
        <p className="letters-gate-hint">
          <Lock size={11} /> This section is private — only for the two of you.
        </p>
      </div>
    </div>
  );
}

// ── Letter Detail Modal ──────────────────────────────────────────────────────

function LetterDetail({
  letter,
  onClose,
}: {
  letter: Letter;
  onClose: () => void;
}) {
  const images = getLetterImages(letter);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);

  const prevImg = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextImg = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const openFullscreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (images.length > 0) {
      setFullscreenImg(images[activeImgIndex]);
    }
  };

  const fullTextClean = cleanVietnameseText(letter.fullText);
  const paragraphs = fullTextClean.split(/\n\n+/);
  const titleClean = cleanVietnameseText(letter.title);
  const fromClean = cleanVietnameseText(letter.from);
  const toClean = cleanVietnameseText(letter.to);
  const locationClean = cleanVietnameseText(letter.location);

  return (
    <>
      <div
        className="letter-detail-backdrop"
        onMouseDown={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={titleClean}
      >
        <div className="letter-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
          <button className="lightbox-close" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>

          {images.length > 0 && (
            <div className="letter-detail-gallery">
              <div
                className="letter-detail-image-container"
                onClick={openFullscreen}
                title="Bấm để xem ảnh phóng to đầy đủ"
              >
                <img
                  src={images[activeImgIndex]}
                  alt={`${titleClean} trang ${activeImgIndex + 1}`}
                  className="letter-full-img"
                />

                <button
                  type="button"
                  className="letter-zoom-btn"
                  onClick={openFullscreen}
                  aria-label="View full photo"
                >
                  <Maximize2 size={13} /> Xem ảnh đầy đủ
                </button>

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="letter-gallery-arrow prev"
                      onClick={prevImg}
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      className="letter-gallery-arrow next"
                      onClick={nextImg}
                      aria-label="Next photo"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <div className="letter-gallery-badge">
                      <ImageIcon size={12} />
                      <span>Trang {activeImgIndex + 1} / {images.length}</span>
                    </div>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="letter-gallery-thumbs">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`letter-thumb-btn ${idx === activeImgIndex ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImgIndex(idx);
                      }}
                      aria-label={`Xem ảnh trang ${idx + 1}`}
                    >
                      <div
                        className="letter-thumb-bg"
                        style={{ backgroundImage: `url('${img}')` }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="letter-detail-body">
            <div className="letter-detail-meta">
              <span className="letter-from-to">
                <BookHeart size={13} /> {fromClean} → {toClean}
              </span>
              <span className="letter-detail-date">
                <Calendar size={13} />{" "}
                {format(new Date(`${letter.date}T00:00:00`), "MMMM d, yyyy")}
              </span>
              {locationClean && (
                <span className="letter-detail-location">
                  <MapPin size={13} /> {locationClean}
                </span>
              )}
              {images.length > 1 && (
                <span className="letter-detail-img-count">
                  <ImageIcon size={13} /> {images.length} ảnh thư
                </span>
              )}
            </div>

            <h2 className="letter-detail-title">{titleClean}</h2>

            <div className="letter-detail-paper-box">
              <div className="letter-detail-text">
                {paragraphs.map((paragraph, i) => {
                  const lines = paragraph.split("\n");
                  const isSignature = paragraph.startsWith("—") || paragraph.includes("Hồ Chí Minh, ngày");
                  return (
                    <p key={i} className={isSignature ? "letter-paragraph-signature" : "letter-paragraph"}>
                      {lines.map((line, j) => (
                        <span key={j}>
                          {line}
                          {j < lines.length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Standalone Fullscreen Lightbox View */}
      {fullscreenImg && (
        <div
          className="letter-fullscreen-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh thư phóng to"
          onMouseDown={(e) => {
            e.stopPropagation();
            setFullscreenImg(null);
          }}
        >
          <div
            className="letter-lightbox-content"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="lightbox-close"
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenImg(null);
              }}
              aria-label="Đóng ảnh"
            >
              <X size={20} />
            </button>

            <div className="letter-lightbox-img-wrap">
              <img
                src={fullscreenImg}
                alt="Ảnh thư phóng to"
                className="letter-lightbox-full-img"
              />
            </div>

            {images.length > 1 && (
              <div className="lightbox-gallery-nav">
                <button
                  type="button"
                  className="lightbox-nav-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const prev = activeImgIndex === 0 ? images.length - 1 : activeImgIndex - 1;
                    setActiveImgIndex(prev);
                    setFullscreenImg(images[prev]);
                  }}
                >
                  <ChevronLeft size={16} /> Trang trước
                </button>
                <span className="lightbox-nav-counter">
                  Trang {activeImgIndex + 1} / {images.length}
                </span>
                <button
                  type="button"
                  className="lightbox-nav-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = activeImgIndex === images.length - 1 ? 0 : activeImgIndex + 1;
                    setActiveImgIndex(next);
                    setFullscreenImg(images[next]);
                  }}
                >
                  Trang sau <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Letter Card ──────────────────────────────────────────────────────────────

function LetterCard({
  letter,
  onClick,
}: {
  letter: Letter;
  onClick: () => void;
}) {
  const images = getLetterImages(letter);
  const preview = getLetterPreview(letter);
  const titleClean = cleanVietnameseText(letter.title);
  const fromClean = cleanVietnameseText(letter.from);
  const toClean = cleanVietnameseText(letter.to);

  return (
    <article
      className="letter-card-item"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      {images.length > 0 ? (
        <div className="letter-card-image-preview">
          <div
            className="letter-card-img-cover"
            style={{ backgroundImage: `url('${images[0]}')` }}
          />
          <div className="letter-card-img-badge">
            <ImageIcon size={11} />
            <span>{images.length} {images.length > 1 ? "photos" : "photo"}</span>
          </div>
        </div>
      ) : (
        <div className="letter-card-paper">
          <span className="letter-greeting">{preview.greeting}</span>
          {preview.lines.map((line, i) => (
            <span key={i} className="letter-preview-line">{line}</span>
          ))}
        </div>
      )}

      <div className="recent-card-copy">
        <p className="card-kind">
          LETTER <span>•</span>{" "}
          {format(new Date(`${letter.date}T00:00:00`), "dd MMM").toUpperCase()}
        </p>
        <h3>{titleClean}</h3>
        <p className="card-meta">
          <BookHeart size={14} /> {fromClean} to {toClean}
        </p>
      </div>
    </article>
  );
}

// ── Main Letters Panel ───────────────────────────────────────────────────────

export function LettersPanel() {
  const [unlocked, setUnlocked] = useState(false);
  const [openLetter, setOpenLetter] = useState<Letter | null>(null);

  if (!unlocked) {
    return <SectionPasswordGate onSuccess={() => setUnlocked(true)} />;
  }

  return (
    <section className="section-block letters-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">From the heart</p>
          <h2>Letters</h2>
        </div>
        <p className="letters-count-badge">
          <BookHeart size={14} /> {lettersData.letters.length} letters
        </p>
      </div>

      <div className="letters-grid">
        {lettersData.letters.map((letter) => (
          <LetterCard
            key={letter.id}
            letter={letter}
            onClick={() => setOpenLetter(letter)}
          />
        ))}
      </div>

      <p className="letters-hint">
        <Lock size={12} /> Each letter is kept private — just for the two of you.
      </p>

      {openLetter && (
        <LetterDetail
          letter={openLetter}
          onClose={() => setOpenLetter(null)}
        />
      )}
    </section>
  );
}
