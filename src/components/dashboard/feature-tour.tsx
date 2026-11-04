"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useLanguage, type Language } from "@/components/dashboard/language-context";

type TourStep = {
  target: string;
  section: "home" | "randomDate";
};

const steps: TourStep[] = [
  { target: "language", section: "home" },
  { target: "theme", section: "home" },
  { target: "music", section: "home" },
  { target: "notifications", section: "home" },
  { target: "days-counter", section: "home" },
  { target: "anniversary", section: "home" },
  { target: "view-events", section: "home" },
  { target: "map", section: "home" },
  { target: "random-date", section: "randomDate" },
  { target: "date-location", section: "randomDate" },
];

const tourCopy: Record<Language, {
  next: string;
  back: string;
  skip: string;
  done: string;
  step: string;
  titles: string[];
  descriptions: string[];
}> = {
  en: {
    next: "Next",
    back: "Back",
    skip: "Skip tour",
    done: "Get started",
    step: "Step",
    titles: [
      "Make it your language",
      "Pick your favorite colors",
      "Your soundtrack, your choice",
      "A little notification corner",
      "Every day is part of your story",
      "Never miss a special day",
      "See every date coming up",
      "A little closer, wherever you are",
      "A fresh idea for your next date",
      "Find plans around your city",
    ],
    descriptions: [
      "Switch the dashboard between English, Vietnamese, Japanese, Chinese, and German.",
      "Choose a theme to give your shared space a look that feels like you.",
      "Play more songs and open the playlist to pick the track you love.",
      "Check here for updates and little reminders.",
      "Watch your days together and the anniversary progress come alive with a gentle animation.",
      "This card keeps your next anniversary and special moment in view.",
      "Open View all events for the complete list of upcoming celebrations.",
      "See both of your saved locations together on the map.",
      "Random Date has a refreshed look and helps you find something fun to do together.",
      "Choose Hanoi or Ho Chi Minh City to get date ideas that fit your location.",
    ],
  },
  vi: {
    next: "Tiếp",
    back: "Quay lại",
    skip: "Bỏ qua tour",
    done: "Bắt đầu thôi",
    step: "Bước",
    titles: [
      "Chọn ngôn ngữ của bạn",
      "Chọn màu sắc yêu thích",
      "Nhạc của riêng hai bạn",
      "Góc thông báo nhỏ",
      "Mỗi ngày đều là một phần câu chuyện",
      "Đừng bỏ lỡ ngày đặc biệt",
      "Xem mọi sự kiện sắp tới",
      "Gần nhau hơn dù ở bất cứ đâu",
      "Ý tưởng mới cho buổi hẹn tiếp theo",
      "Tìm kế hoạch quanh thành phố",
    ],
    descriptions: [
      "Đổi giao diện giữa tiếng Anh, Việt, Nhật, Trung và Đức.",
      "Chọn màu sắc để không gian chung mang phong cách của hai bạn.",
      "Có thêm nhiều bài hát; mở danh sách phát để chọn bài mình yêu thích.",
      "Xem các cập nhật và lời nhắc nhỏ tại đây.",
      "Theo dõi số ngày bên nhau và tiến trình đến kỷ niệm với hiệu ứng nhẹ nhàng.",
      "Thẻ này giúp bạn luôn nhớ dịp kỷ niệm và sự kiện sắp tới.",
      "Chọn View all events để xem đầy đủ các dịp sắp diễn ra.",
      "Xem vị trí đã lưu của cả hai trên bản đồ.",
      "Random Date có giao diện mới, giúp hai bạn tìm hoạt động vui vẻ để cùng làm.",
      "Chọn Hà Nội hoặc Hồ Chí Minh để xem gợi ý hẹn hò phù hợp với địa điểm.",
    ],
  },
  ja: {
    next: "次へ",
    back: "戻る",
    skip: "ツアーをスキップ",
    done: "はじめる",
    step: "ステップ",
    titles: [
      "好きな言語を選ぶ",
      "お気に入りの色を選ぶ",
      "ふたりだけの音楽",
      "お知らせコーナー",
      "毎日がふたりの物語",
      "大切な日を忘れずに",
      "これからの予定をすべて見る",
      "離れていても、もっと近くに",
      "次のデートに新しいアイデア",
      "街に合ったプランを見つける",
    ],
    descriptions: [
      "英語、ベトナム語、日本語、中国語、ドイツ語に切り替えられます。",
      "ふたりの空間にぴったりのテーマを選びましょう。",
      "曲が増えました。プレイリストからお気に入りを選べます。",
      "更新や小さなお知らせはこちらで確認できます。",
      "一緒に過ごした日数と記念日までの進み具合をアニメーションで楽しめます。",
      "次の記念日や大切な予定をここで確認できます。",
      "「すべてのイベント」を開くと、これからのお祝いを一覧できます。",
      "ふたりが保存した場所を地図で一緒に確認できます。",
      "新しいデザインのRandom Dateで、ふたりの楽しい予定を見つけましょう。",
      "ハノイまたはホーチミンを選ぶと、その場所に合ったデート案が表示されます。",
    ],
  },
  zh: {
    next: "下一步",
    back: "返回",
    skip: "跳过导览",
    done: "开始使用",
    step: "步骤",
    titles: [
      "选择你喜欢的语言",
      "挑选喜欢的颜色",
      "属于你们的音乐",
      "小小通知角落",
      "每一天都是你们故事的一部分",
      "别错过特别的日子",
      "查看所有即将到来的活动",
      "无论相隔多远，都更靠近",
      "为下一次约会找个新点子",
      "寻找适合所在城市的计划",
    ],
    descriptions: [
      "可以在英语、越南语、日语、中文和德语之间切换。",
      "选择喜欢的主题，让你们的空间更有自己的风格。",
      "这里有更多歌曲，也可以打开播放列表选择喜欢的曲目。",
      "在这里查看更新和小提醒。",
      "用轻柔的动画看看相伴的天数和纪念日进度。",
      "这里会显示下一个纪念日和特别时刻。",
      "打开“查看所有活动”，浏览即将到来的庆祝日。",
      "在地图上一起查看你们保存的位置。",
      "全新设计的 Random Date 帮你们找到有趣的约会活动。",
      "选择河内或胡志明市，获取适合当地的约会点子。",
    ],
  },
  de: {
    next: "Weiter",
    back: "Zurück",
    skip: "Tour überspringen",
    done: "Los geht's",
    step: "Schritt",
    titles: [
      "Wähle deine Sprache",
      "Finde deine Lieblingsfarben",
      "Euer ganz persönlicher Soundtrack",
      "Ein kleiner Benachrichtigungsbereich",
      "Jeder Tag ist Teil eurer Geschichte",
      "Keinen besonderen Tag verpassen",
      "Alle kommenden Ereignisse ansehen",
      "Einander näher, egal wo ihr seid",
      "Eine neue Idee für euer nächstes Date",
      "Pläne für eure Stadt finden",
    ],
    descriptions: [
      "Wechsle zwischen Englisch, Vietnamesisch, Japanisch, Chinesisch und Deutsch.",
      "Wähle ein Design, das zu eurem gemeinsamen Ort passt.",
      "Es gibt mehr Songs. Öffne die Playlist und wähle deinen Lieblingstitel.",
      "Hier findest du Neuigkeiten und kleine Erinnerungen.",
      "Sieh eure gemeinsamen Tage und den Fortschritt zum Jahrestag mit einer sanften Animation.",
      "Diese Karte zeigt euren nächsten Jahrestag und besondere Momente.",
      "Öffne „Alle Ereignisse“, um alle kommenden Feiern zu sehen.",
      "Sieh eure gespeicherten Standorte gemeinsam auf der Karte.",
      "Random Date hat ein neues Design und hilft euch, gemeinsame Aktivitäten zu finden.",
      "Wähle Hanoi oder Ho-Chi-Minh-Stadt für passende Date-Ideen vor Ort.",
    ],
  },
};

const storageKey = "ours-feature-tour-v1";

type FeatureTourProps = {
  ready: boolean;
  activeSection: "home" | "memories" | "randomDate" | "letters" | "comingSoon";
  onNavigate: (section: "home" | "randomDate") => void;
};

export function FeatureTour({ ready, activeSection, onNavigate }: FeatureTourProps) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const copy = tourCopy[language];
  const step = steps[stepIndex];

  const complete = useCallback(() => {
    window.localStorage.setItem(storageKey, "done");
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!ready || window.localStorage.getItem(storageKey)) return;
    const timer = window.setTimeout(() => setIsOpen(true), 500);
    return () => window.clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") complete();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [complete, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeSection !== step.section) {
      onNavigate(step.section);
      return;
    }

    let attempts = 0;
    let timer: number | undefined;
    let frame = 0;
    let cancelled = false;
    const targetSelector = `[data-tour="${step.target}"]`;

    const updateRect = () => {
      if (cancelled) return;
      const target = document.querySelector<HTMLElement>(targetSelector);
      if (!target) {
        attempts += 1;
        if (attempts < 20) timer = window.setTimeout(updateRect, 100);
        else complete();
        return;
      }

      const rect = target.getBoundingClientRect();
      const isInView =
        rect.top >= 12 &&
        rect.left >= 12 &&
        rect.bottom <= window.innerHeight - 12 &&
        rect.right <= window.innerWidth - 12;

      if (!isInView && attempts === 0) {
        attempts += 1;
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        timer = window.setTimeout(updateRect, 380);
        return;
      }

      const currentRect = target.getBoundingClientRect();
      const padding = 8;
      setTargetRect(new DOMRect(
        Math.max(4, currentRect.left - padding),
        Math.max(4, currentRect.top - padding),
        Math.min(window.innerWidth - 8, currentRect.width + padding * 2),
        Math.min(window.innerHeight - 8, currentRect.height + padding * 2)
      ));
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateRect);
    };

    timer = window.setTimeout(updateRect, 100);
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, true);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
    };
  }, [activeSection, complete, isOpen, onNavigate, step.section, step.target]);

  if (!isOpen || !targetRect) return null;

  const cardWidth = Math.min(380, viewport.width - 32);
  const cardLeft = Math.min(
    viewport.width - cardWidth - 16,
    Math.max(16, targetRect.left + targetRect.width / 2 - cardWidth / 2)
  );
  const cardTop = Math.max(
    16,
    targetRect.top > viewport.height * 0.58
      ? targetRect.top - 250
      : Math.min(targetRect.bottom + 18, viewport.height - 250)
  );
  const style = {
    "--tour-left": `${targetRect.left}px`,
    "--tour-top": `${targetRect.top}px`,
    "--tour-width": `${targetRect.width}px`,
    "--tour-height": `${targetRect.height}px`,
    "--tour-card-left": `${cardLeft}px`,
    "--tour-card-top": `${cardTop}px`,
  } as React.CSSProperties;

  return (
    <div className="feature-tour" style={style} role="dialog" aria-modal="true" aria-labelledby="feature-tour-title">
      <svg className="feature-tour-shade" width={viewport.width} height={viewport.height} aria-hidden="true">
        <defs>
          <mask id="feature-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left}
              y={targetRect.top}
              width={targetRect.width}
              height={targetRect.height}
              rx="16"
              fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(18, 15, 23, .62)" mask="url(#feature-tour-mask)" />
      </svg>
      <div className="feature-tour-spotlight" aria-hidden="true" />
      <section className="feature-tour-card">
        <div className="feature-tour-card-top">
          <span>{copy.step} {stepIndex + 1} / {steps.length}</span>
          <button type="button" onClick={complete} aria-label={copy.skip}><X size={17} /></button>
        </div>
        <div className="feature-tour-progress" aria-hidden="true">
          <span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
        </div>
        <h2 id="feature-tour-title">{copy.titles[stepIndex]}</h2>
        <p>{copy.descriptions[stepIndex]}</p>
        <div className="feature-tour-actions">
          <button type="button" className="feature-tour-skip" onClick={complete}>{copy.skip}</button>
          <div>
            {stepIndex > 0 && (
              <button
                type="button"
                className="feature-tour-back"
                onClick={() => setStepIndex((current) => current - 1)}
              >
                <ArrowLeft size={15} /> {copy.back}
              </button>
            )}
            {stepIndex === steps.length - 1 ? (
              <button type="button" className="feature-tour-next" onClick={complete}>{copy.done}</button>
            ) : (
              <button
                type="button"
                className="feature-tour-next"
                onClick={() => setStepIndex((current) => current + 1)}
              >
                {copy.next} <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
