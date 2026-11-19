/** Linien-Icons für die Shop-Bereiche (im Stil der Kategorie-Kacheln) */
type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const TShirtIcon = ({ className }: P) => (
  <svg viewBox="0 0 48 48" className={className} {...base}>
    <path d="M17 7l-9 5-4 9 7 3 2-4v21h22V20l2 4 7-3-4-9-9-5c-1 3-4 5-7 5s-6-2-7-5z" />
  </svg>
);
export const HoodieIcon = ({ className }: P) => (
  <svg viewBox="0 0 48 48" className={className} {...base}>
    <path d="M16 12c0-5 4-8 8-8s8 3 8 8" />
    <path d="M16 12l-8 5-4 20h7l2-11v18h22V26l2 11h7l-4-20-8-5c-1 4-4 7-8 7s-7-3-8-7z" />
    <path d="M21 17v6M27 17v6M18 34h12" />
  </svg>
);
export const FlagIcon = ({ className }: P) => (
  <svg viewBox="0 0 48 48" className={className} {...base}>
    <path d="M9 44V5" />
    <path d="M9 7c6-3 11 3 17 0s10-2 13 0v20c-3-2-7-3-13 0s-11-3-17 0" />
    <path d="M9 14c6-3 11 3 17 0s10-2 13 0M9 21c6-3 11 3 17 0s10-2 13 0" />
  </svg>
);
export const StickerIcon = ({ className }: P) => (
  <svg viewBox="0 0 48 48" className={className} {...base}>
    <path d="M8 12a4 4 0 014-4h24a4 4 0 014 4v14L26 40H12a4 4 0 01-4-4z" />
    <path d="M26 40V30a4 4 0 014-4h10" />
    <path d="M18 18l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" />
  </svg>
);
export const categoryIcon = { tshirts: TShirtIcon, hoodies: HoodieIcon, flags: FlagIcon, stickers: StickerIcon } as const;
