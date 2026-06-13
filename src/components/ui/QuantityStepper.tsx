import { cn } from "@/lib/utils";

const TONE_STYLES = {
  neutral: {
    root: "border-neutral-200 bg-white",
    divider: "border-neutral-200",
    button: "text-neutral-500 hover:text-neutral-950",
    value: "text-neutral-950",
  },
  slate: {
    root: "border-slate-200 bg-white",
    divider: "border-slate-200",
    button: "text-slate-500 hover:text-slate-950",
    value: "text-slate-950",
  },
} as const;

type QuantityStepperTone = keyof typeof TONE_STYLES;

type QuantityStepperProps = {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
  tone?: QuantityStepperTone;
  compact?: boolean;
  className?: string;
  valueClassName?: string;
};

export default function QuantityStepper({
  value,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  tone = "neutral",
  compact = false,
  className,
  valueClassName,
}: QuantityStepperProps) {
  const toneStyles = TONE_STYLES[tone];
  const controlSize = compact ? "h-10 w-10 text-base" : "h-11 w-11 text-lg";
  const valueSize = compact
    ? "h-10 min-w-[3.5rem] px-3"
    : "h-11 min-w-[4rem] px-4";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center self-start overflow-hidden rounded-full border shadow-sm",
        toneStyles.root,
        className,
      )}
    >
      <button
        type="button"
        onClick={onDecrement}
        aria-label={decrementLabel}
        className={cn(
          "flex shrink-0 items-center justify-center font-medium leading-none transition-colors",
          controlSize,
          toneStyles.button,
        )}
      >
        -
      </button>
      <span
        className={cn(
          "flex items-center justify-center border-x px-3 text-center text-sm font-semibold tabular-nums",
          toneStyles.divider,
          toneStyles.value,
          valueSize,
          valueClassName,
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label={incrementLabel}
        className={cn(
          "flex shrink-0 items-center justify-center font-medium leading-none transition-colors",
          controlSize,
          toneStyles.button,
        )}
      >
        +
      </button>
    </div>
  );
}
