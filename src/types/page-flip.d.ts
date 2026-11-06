declare module "page-flip" {
  export interface PageFlipSettings {
    width: number;
    height: number;
    size?: "fixed" | "stretch";
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    usePortrait?: boolean;
    autoSize?: boolean;
    showCover?: boolean;
    maxShadowOpacity?: number;
    mobileScrollSupport?: boolean;
    swipeDistance?: number;
    useMouseEvents?: boolean;
  }

  export interface PageFlipEvent<T = unknown> {
    data: T;
    object: PageFlip;
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings);
    loadFromImages(images: string[]): void;
    update(): void;
    getBoundsRect(): { left: number; top: number; width: number; height: number; pageWidth: number };
    getFlipController(): { getCalculation(): { getDirection(): number } | null };
    on(event: "flip", callback: (event: PageFlipEvent<number>) => void): PageFlip;
    on(event: "init", callback: (event: PageFlipEvent<{ page: number; mode: "portrait" | "landscape" }>) => void): PageFlip;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    startUserTouch(point: { x: number; y: number }): void;
    userMove(point: { x: number; y: number }, isTouch: boolean): void;
    userStop(point: { x: number; y: number }): void;
    destroy(): void;
  }

  const pageFlipLibrary: { PageFlip: typeof PageFlip };
  export default pageFlipLibrary;
}
