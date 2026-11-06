"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import {
  BookHeart,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Lock,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/dashboard/language-context";
import type { PageFlip } from "page-flip";
interface Letter {
  id: string;
  author: string;
  date: string;
  pages: string[];
}

interface PreparedLetterPages {
  aspectRatio: number;
  sources: string[];
  sourceWidth: number;
  sourceHeight: number;
}

function loadLetterImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load letter page: ${src}`));
    image.src = src;
  });
}

function cleanVietnameseText(str?: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/([a-zA-ZăâêôơưĂÂÊÔƠƯ])\s+([\u0300\u0301\u0303\u0309\u0323])/g, "$1$2")
    .normalize("NFC");
}

// ── Section Password Gate ────────────────────────────────────────────────────

function SectionPasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useLanguage();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [shaking, setShaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const checkCode = async (nextDigits: string[]) => {
    if (nextDigits.some((d) => d === "") || isVerifying) return;
    const pin = nextDigits.join("");
    setIsVerifying(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/letters/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess();
      } else {
        setShaking(true);
        setErrorMsg(data.error || t("incorrectPin"));
        setTimeout(() => {
          setDigits(["", "", "", "", "", ""]);
          setShaking(false);
          inputRefs.current[0]?.focus();
        }, 650);
      }
    } catch {
      setShaking(true);
      setErrorMsg(t("networkError"));
    } finally {
      setIsVerifying(false);
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
        <h2 className="letters-gate-title">{t("letters")}</h2>
        <p className="letters-gate-sub">
          {t("enterSixDigitCode")}
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
              disabled={isVerifying}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`pin-input ${d ? "pin-filled" : ""}`}
              aria-label={`${i + 1}`}
            />
          ))}
        </div>
        {errorMsg && <p className="pin-error-msg">{errorMsg}</p>}
        <p className="letters-gate-hint">
          <Lock size={11} /> {t("privateOnlyUs")}
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
  const { t, locale } = useLanguage();
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isBookReady, setIsBookReady] = useState(false);
  const [bookError, setBookError] = useState(false);
  const [preparedPages, setPreparedPages] = useState<PreparedLetterPages | null>(null);
  const [pageSize, setPageSize] = useState({ width: 280, height: 390 });
  const bookHostRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const swipeStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const author = cleanVietnameseText(letter.author);
  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${letter.date}T12:00:00`));

  useEffect(() => {
    let cancelled = false;
    setPreparedPages(null);
    setIsBookReady(false);
    setBookError(false);
    setActivePageIndex(0);

    void Promise.all(letter.pages.map(loadLetterImage))
      .then((images) => {
        const firstImage = images[0];
        if (!firstImage || !firstImage.naturalWidth || !firstImage.naturalHeight) {
          throw new Error("The letter does not contain a valid page image.");
        }

        const aspectRatio = firstImage.naturalWidth / firstImage.naturalHeight;
        // Keep the original files instead of creating a lossy canvas copy.
        const sources = images.map((image) => image.src);

        if (!cancelled) {
          setPreparedPages({
            aspectRatio,
            sources,
            sourceWidth: Math.min(...images.map((image) => image.naturalWidth)),
            sourceHeight: Math.min(...images.map((image) => image.naturalHeight)),
          });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Failed to prepare letter page images.", error);
        setBookError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [letter.id, letter.pages]);

  useEffect(() => {
    if (!preparedPages) return;
    const resizePage = () => {
      const isNarrowScreen = window.innerWidth < 640;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const maxWidth = Math.max(180, Math.min(window.innerWidth - (isNarrowScreen ? 32 : 80), 720));
      const maxHeight = Math.max(180, Math.min(viewportHeight - (isNarrowScreen ? 168 : 188), 860));
      const width = Math.floor(Math.min(maxWidth, maxHeight * preparedPages.aspectRatio));
      setPageSize({ width, height: Math.floor(width / preparedPages.aspectRatio) });
    };

    resizePage();
    window.addEventListener("resize", resizePage);
    return () => window.removeEventListener("resize", resizePage);
  }, [preparedPages]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => pageFlipRef.current?.update());
    return () => window.cancelAnimationFrame(animationFrame);
  }, [pageSize]);

  useEffect(() => {
    if (!isBookReady || !preparedPages) return;

    const applyCanvasResolution = () => {
      const canvas = bookHostRef.current?.querySelector("canvas");
      if (!canvas) return;

      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;

      const sourceScale = Math.min(
        preparedPages.sourceWidth / width,
        preparedPages.sourceHeight / height,
      );
      const pixelRatio = Math.max(
        1,
        Math.min(window.devicePixelRatio || 1, sourceScale, 2.5),
      );
      const pixelWidth = Math.round(width * pixelRatio);
      const pixelHeight = Math.round(height * pixelRatio);

      if (canvas.width === pixelWidth && canvas.height === pixelHeight) return;

      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      const context = canvas.getContext("2d");
      context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      if (context) context.imageSmoothingQuality = "high";
      pageFlipRef.current?.update();
    };

    applyCanvasResolution();
    const handleResize = () => window.requestAnimationFrame(applyCanvasResolution);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isBookReady, pageSize, preparedPages]);

  useEffect(() => {
    const host = bookHostRef.current;
    if (!host || !preparedPages) return;

    let cancelled = false;
    let pageFlip: PageFlip | null = null;
    const container = host.ownerDocument.createElement("div");
    container.className = "letter-flip-book";
    host.appendChild(container);
    setIsBookReady(false);
    setBookError(false);
    setActivePageIndex(0);

    void import("page-flip").then((library) => {
      if (cancelled) return;

      const { PageFlip: PageFlipConstructor } = library.default;
      pageFlip = new PageFlipConstructor(container, {
        width: 640,
        height: Math.round(640 / preparedPages.aspectRatio),
        size: "stretch",
        // PageFlip switches to a two-page spread once the reader is wider
        // than twice this value. Keep it above our 720px reader maximum so
        // every supplied image is always one logical page.
        minWidth: 400,
        maxWidth: 720,
        minHeight: 240,
        maxHeight: 1000,
        usePortrait: true,
        autoSize: false,
        showCover: false,
        maxShadowOpacity: 0.42,
        mobileScrollSupport: false,
        swipeDistance: 10,
        useMouseEvents: false,
      });

      pageFlip.on("flip", ({ data }) => {
        if (typeof data === "number") setActivePageIndex(data);
      });
      pageFlip.on("init", ({ data }) => {
        if (typeof data === "object" && data !== null && "page" in data && typeof data.page === "number") {
          setActivePageIndex(data.page);
        }
        setIsBookReady(true);
      });

      pageFlipRef.current = pageFlip;
      pageFlip.loadFromImages(preparedPages.sources);
    }).catch((error: unknown) => {
      if (cancelled) return;
      console.error("Failed to load the letter page-flip reader.", error);
      pageFlipRef.current = null;
      pageFlip?.destroy();
      pageFlip = null;
      container.remove();
      setBookError(true);
    });

    return () => {
      cancelled = true;
      if (pageFlipRef.current === pageFlip) pageFlipRef.current = null;
      pageFlip?.destroy();
      container.remove();
    };
  }, [letter.id, preparedPages]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") pageFlipRef.current?.flipNext();
      if (event.key === "ArrowLeft") pageFlipRef.current?.flipPrev();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const getPagePoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const pageSurface = bookHostRef.current?.querySelector("canvas");
    const bounds = pageSurface?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const finishCommittedFlip = (
    point: { x: number; y: number },
    isTouch: boolean,
  ) => {
    const pageFlip = pageFlipRef.current;
    if (!pageFlip) return;

    const bounds = pageFlip.getBoundsRect();
    const currentDirection = pageFlip.getFlipController().getCalculation()?.getDirection();
    const centerX = bounds.left + bounds.width / 2;
    const targetX = currentDirection === 1 ? centerX + 2 : centerX - 2;
    const distanceX = targetX - point.x;
    let frame = 0;
    const frames = 8;

    const continueFold = () => {
      frame += 1;
      const progress = frame / frames;
      const easedProgress = 1 - (1 - progress) ** 3;
      const nextPoint = { x: point.x + distanceX * easedProgress, y: point.y };
      pageFlip.userMove(nextPoint, isTouch);
      if (frame < frames) {
        window.requestAnimationFrame(continueFold);
      } else {
        pageFlip.userStop(nextPoint);
      }
    };

    window.requestAnimationFrame(continueFold);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !pageFlipRef.current ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      (event.target instanceof Element && event.target.closest("button"))
    ) return;

    swipeStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    pageFlipRef.current.startUserTouch(getPagePoint(event));
    event.preventDefault();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const swipeStart = swipeStartRef.current;
    if (swipeStart?.pointerId !== event.pointerId) return;
    pageFlipRef.current?.userMove(getPagePoint(event), event.pointerType === "touch");
    event.preventDefault();
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const swipeStart = swipeStartRef.current;
    if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;

    const horizontalDistance = event.clientX - swipeStart.x;
    const verticalDistance = event.clientY - swipeStart.y;
    const hasPageInSwipeDirection = horizontalDistance < 0
      ? activePageIndex < letter.pages.length - 1
      : activePageIndex > 0;
    const isCommittedSwipe =
      hasPageInSwipeDirection &&
      Math.abs(horizontalDistance) >= event.currentTarget.getBoundingClientRect().width * 0.24 &&
      Math.abs(horizontalDistance) > Math.abs(verticalDistance);

    const finalPoint = getPagePoint(event);
    if (isCommittedSwipe) {
      finishCommittedFlip(finalPoint, event.pointerType === "touch");
    } else {
      pageFlipRef.current?.userStop(finalPoint);
    }

    swipeStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (swipeStartRef.current?.pointerId !== event.pointerId) return;
    pageFlipRef.current?.userStop(getPagePoint(event));
    swipeStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return createPortal(
    <div
      className="ui-modal-backdrop letter-detail-backdrop"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${author} · ${formattedDate}`}
    >
      <section
        className="ui-modal-surface letter-detail-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="letter-detail-toolbar">
          <button
            type="button"
            className="ui-modal-close letter-detail-close"
            onClick={onClose}
            aria-label={t("close")}
          >
            <X size={19} />
          </button>
        </header>

        <div
          className="letter-reader"
          style={{ width: `${pageSize.width}px` } as CSSProperties}
        >
          <div
          className="letter-page-stage"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerCancel}
          style={{
            height: `${pageSize.height}px`,
          } as CSSProperties}
          aria-busy={!isBookReady && !bookError}
        >
          <div
            ref={bookHostRef}
            className="letter-flip-book-host"
            role="img"
            aria-label={`Letter by ${author}, page ${activePageIndex + 1} of ${letter.pages.length}`}
          />
          {!isBookReady && !bookError && (
            <div
              className="letter-book-loading"
              role="status"
              aria-label={locale.startsWith("vi") ? "Đang tải thư" : "Loading letter"}
            >
              <span />
            </div>
          )}
          {bookError && (
            <p className="letter-book-error" role="alert">
              {locale.startsWith("vi") ? "Không thể tải trang thư." : "Unable to load this letter."}
            </p>
          )}
          </div>
          {letter.pages.length > 1 && preparedPages && (
            <nav className="letter-page-controls" aria-label="Letter page navigation">
              <button
                type="button"
                className="letter-page-arrow previous"
                onClick={() => pageFlipRef.current?.flipPrev()}
                aria-label={t("previous")}
                disabled={!isBookReady || activePageIndex === 0}
              >
                <ChevronLeft size={20} />
              </button>
              <span className="letter-page-count" aria-live="polite">
                {activePageIndex + 1} / {letter.pages.length}
              </span>
              <button
                type="button"
                className="letter-page-arrow next"
                onClick={() => pageFlipRef.current?.flipNext()}
                aria-label={t("next")}
                disabled={!isBookReady || activePageIndex >= letter.pages.length - 1}
              >
                <ChevronRight size={20} />
              </button>
            </nav>
          )}
        </div>

        <footer className="letter-detail-footer">
          <span><BookHeart size={13} /> {author}</span>
          <span><Calendar size={13} /> <time dateTime={letter.date}>{formattedDate}</time></span>
        </footer>
      </section>
    </div>,
    document.body
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
  const { locale } = useLanguage();
  const author = cleanVietnameseText(letter.author);
  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${letter.date}T12:00:00`));

  return (
    <article
      className="letter-card-item"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${author} · ${formattedDate}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="letter-card-image-preview">
        <img
          className="letter-card-page"
          src={letter.pages[0]}
          alt={`First page of letter by ${author}`}
          loading="lazy"
        />
      </div>
      <div className="letter-card-meta">
        <span><BookHeart size={12} /> {author}</span>
        <span><Calendar size={12} /> <time dateTime={letter.date}>{formattedDate}</time></span>
      </div>
    </article>
  );
}

// ── Main Letters Panel ───────────────────────────────────────────────────────

export function LettersPanel() {
  const { t } = useLanguage();
  const [unlocked, setUnlocked] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [openLetter, setOpenLetter] = useState<Letter | null>(null);

  useEffect(() => {
    fetch("/api/letters")
      .then((res) => {
        if (res.ok) {
          return res.json().then((data) => {
            setLetters(data.letters || []);
            setUnlocked(true);
          });
        }
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, []);

  const fetchLetters = async () => {
    try {
      const res = await fetch("/api/letters");
      if (res.ok) {
        const data = await res.json();
        setLetters(data.letters || []);
        setUnlocked(true);
      }
    } catch {}
  };

  if (checkingAuth) {
    return (
      <div className="letters-gate">
        <div className="letters-gate-inner">
          <p className="letters-gate-sub">{t("checkingAuthentication")}</p>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return <SectionPasswordGate onSuccess={fetchLetters} />;
  }

  return (
    <section className="section-block letters-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">{t("fromTheHeart")}</p>
          <h2>{t("letters")}</h2>
        </div>
        <p className="letters-count-badge">
          <BookHeart size={14} /> {letters.length} {t("letterCount")}
        </p>
      </div>

      <div className="letters-grid">
        {letters.map((letter) => (
          <LetterCard
            key={letter.id}
            letter={letter}
            onClick={() => setOpenLetter(letter)}
          />
        ))}
      </div>

      <p className="letters-hint">
        <Lock size={12} /> {t("eachLetterPrivate")}
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
