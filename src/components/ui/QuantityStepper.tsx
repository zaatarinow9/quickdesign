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
  const controlSize = compact ? "min-h-10 min-w-10 px-3.5" : "min-h-11 min-w-11 px-4";
  const valueSize = compact ? "min-h-10 min-w-[3.25rem] px-3.5" : "min-h-11 min-w-[4rem] px-4";

  return (
    <div
      className={cn(
        "inline-flex items-center self-start overflow-hidden rounded-full border shadow-sm",
        toneStyles.root,
        className,
      )}
    >
      <button
        type="button"
        onClick={onDecrement}
        aria-label={decrementLabel}
        className={cn(
          "flex items-center justify-center text-lg font-medium leading-none transition-colors",
          controlSize,
          toneStyles.button,
        )}
      >
        -
      </button>
      <span
        className={cn(
          "flex items-center justify-center border-x text-center text-sm font-semibold",
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
          "flex items-center justify-center text-lg font-medium leading-none transition-colors",
          controlSize,
          toneStyles.button,
        )}
      >
        +
      </button>
    </div>
  );
}
