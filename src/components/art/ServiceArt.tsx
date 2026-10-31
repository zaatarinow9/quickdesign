import type { ServiceArtVariant } from "@/content/services";
import { cn } from "@/lib/utils";

/**
 * Art-directed line illustrations for each discipline. They are drawn in
 * `currentColor` with a single accent, so they adapt to dark and light
 * surfaces. They illustrate a capability – they are not project photos.
 */

const A = "var(--color-accent)";
const B = "var(--color-accent-2)";

function Frame({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      className={cn("h-full w-full", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

function Crop({ x, y, w, h, o = 10 }: { x: number; y: number; w: number; h: number; o?: number }) {
  const l = 12;
  return (
    <g strokeOpacity={0.45} strokeWidth={0.9}>
      <path d={`M${x - o - l} ${y}H${x - o}M${x} ${y - o - l}V${y - o}`} />
      <path d={`M${x + w + o} ${y}H${x + w + o + l}M${x + w} ${y - o - l}V${y - o}`} />
      <path d={`M${x - o - l} ${y + h}H${x - o}M${x} ${y + h + o}V${y + h + o + l}`} />
      <path d={`M${x + w + o} ${y + h}H${x + w + o + l}M${x + w} ${y + h + o}V${y + h + o + l}`} />
    </g>
  );
}

const transition = "transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]";

function DesignArt() {
  return (
    <Frame label="Illustration: Gestaltung mit Kurven, Ankerpunkten und Farbfeldern">
      <g strokeOpacity={0.12}>
        {Array.from({ length: 9 }, (_, i) => (
          <path key={`v${i}`} d={`M${40 + i * 40} 30V270`} />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <path key={`h${i}`} d={`M30 ${30 + i * 40}H370`} />
        ))}
      </g>
      <rect x={60} y={50} width={280} height={200} strokeOpacity={0.5} />
      <g className={cn(transition, "group-hover:-translate-y-2")}>
        <path d="M90 210C130 90 210 90 230 150S320 220 320 90" strokeWidth={2.5} />
        <path d="M90 210L140 120M230 150L190 110M230 150L270 190M320 90L300 60" strokeOpacity={0.4} strokeDasharray="3 4" />
        {[
          [90, 210],
          [230, 150],
          [320, 90],
        ].map(([cx, cy]) => (
          <rect key={cx} x={cx - 5} y={cy - 5} width={10} height={10} fill="currentColor" stroke="none" />
        ))}
        {[
          [140, 120],
          [190, 110],
          [270, 190],
          [300, 60],
        ].map(([cx, cy], i) => (
          <circle key={cx} cx={cx} cy={cy} r={4} fill={i % 2 ? B : A} stroke="none" />
        ))}
      </g>
      <g className={cn(transition, "group-hover:translate-x-2")}>
        <rect x={262} y={214} width={22} height={22} fill="currentColor" stroke="none" />
        <rect x={290} y={214} width={22} height={22} fill={B} stroke="none" />
        <rect x={318} y={214} width={22} height={22} fill={A} stroke="none" />
      </g>
      <text x={72} y={84} fill="currentColor" stroke="none" fontSize={30} fontWeight={500} style={{ fontFamily: "var(--font-display)" }}>
        Aa
      </text>
    </Frame>
  );
}

function PrintArt() {
  return (
    <Frame label="Illustration: gestapelte Visitenkarten mit Schnittmarken">
      <g className={cn(transition, "group-hover:-rotate-3")} style={{ transformOrigin: "200px 160px" }}>
        <rect x={110} y={110} width={190} height={110} rx={6} strokeOpacity={0.3} transform="rotate(-10 205 165)" />
        <rect x={110} y={100} width={190} height={110} rx={6} strokeOpacity={0.55} transform="rotate(-4 205 155)" />
      </g>
      <g className={cn(transition, "group-hover:-translate-y-3 group-hover:rotate-2")} style={{ transformOrigin: "200px 150px" }}>
        <rect x={105} y={95} width={190} height={110} rx={6} fill="currentColor" fillOpacity={0.06} strokeWidth={1.75} />
        <circle cx={138} cy={128} r={14} strokeWidth={2} />
        <path d="M131 128h14" strokeWidth={2} />
        <path d="M170 122h70M170 134h44" strokeOpacity={0.6} />
        <path d="M123 178h96M123 188h64" strokeOpacity={0.4} />
        <path d="M105 199h190" stroke={A} strokeWidth={3} />
      </g>
      <Crop x={105} y={95} w={190} h={110} o={14} />
      <path d="M40 260h320" strokeOpacity={0.2} />
    </Frame>
  );
}

function SignageArt() {
  return (
    <Frame label="Illustration: Firmenschild mit Abstandshaltern an einer Wand">
      <g strokeOpacity={0.12}>
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={`M${20 + i * 34} 20L${-40 + i * 34} 280`} />
        ))}
      </g>
      <path d="M20 250H380" strokeOpacity={0.5} />
      <g className={cn(transition, "group-hover:-translate-y-2")}>
        <rect x={90} y={70} width={220} height={130} rx={4} fill="currentColor" fillOpacity={0.07} strokeWidth={1.75} />
        {[
          [106, 86],
          [294, 86],
          [106, 184],
          [294, 184],
        ].map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r={6} />
            <circle cx={cx} cy={cy} r={2} fill="currentColor" stroke="none" />
          </g>
        ))}
        <circle cx={150} cy={135} r={22} strokeWidth={2.25} />
        <path d="M140 135h20" strokeWidth={2.25} />
        <path d="M188 126h86" strokeWidth={4} />
        <path d="M188 146h56" stroke={A} strokeWidth={4} />
        <path d="M250 146h24" stroke={B} strokeWidth={4} />
      </g>
      <path d="M90 214h220" strokeOpacity={0.25} strokeDasharray="2 5" />
    </Frame>
  );
}

function VehicleArt() {
  return (
    <Frame label="Illustration: Transporter mit Fahrzeugbeschriftung">
      <path d="M20 236H380" strokeOpacity={0.35} />
      <g className={cn(transition, "group-hover:translate-x-3")}>
        <path
          d="M52 216V110c0-10 8-18 18-18h170c10 0 18 4 24 12l48 58c6 7 16 12 26 14l14 3c8 2 14 9 14 17v10c0 6-4 10-10 10H52z"
          fill="currentColor"
          fillOpacity={0.06}
          strokeWidth={1.75}
        />
        <path d="M262 108l40 50h-52v-50z" strokeOpacity={0.6} />
        <path d="M52 190c80-6 150-40 230-26 30 5 56 18 74 30" stroke={A} strokeWidth={6} strokeLinecap="butt" />
        <path d="M52 176c80-6 150-38 228-24" stroke={B} strokeWidth={2} />
        <circle cx={92} cy={130} r={16} strokeWidth={2} />
        <path d="M84 130h16" strokeWidth={2} />
        <path d="M120 124h84M120 138h52" strokeWidth={3} />
        <g>
          <circle cx={110} cy={220} r={20} fill="var(--art-bg, transparent)" strokeWidth={1.75} />
          <circle cx={110} cy={220} r={7} />
          <circle cx={300} cy={220} r={20} fill="var(--art-bg, transparent)" strokeWidth={1.75} />
          <circle cx={300} cy={220} r={7} />
        </g>
      </g>
    </Frame>
  );
}

function LettersArt() {
  const letters = "QD";
  return (
    <Frame label="Illustration: beleuchtete 3D-Buchstaben">
      <defs>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.55} />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse
        cx={200}
        cy={150}
        rx={170}
        ry={90}
        fill="url(#halo)"
        stroke="none"
        className="opacity-60 transition-opacity duration-700 group-hover:opacity-100"
      />
      <g style={{ fontFamily: "var(--font-display)" }} fontSize={150} fontWeight={600} textAnchor="middle">
        {[10, 8, 6, 4, 2].map((o) => (
          <text key={o} x={200 + o} y={205 + o} fill="none" stroke="currentColor" strokeOpacity={0.12 + (10 - o) * 0.03}>
            {letters}
          </text>
        ))}
        <text x={200} y={205} fill="currentColor" stroke="none">
          {letters}
        </text>
      </g>
      <path d="M40 252H360" strokeOpacity={0.3} />
      {[100, 160, 240, 300].map((x) => (
        <path key={x} d={`M${x} 222v14`} strokeOpacity={0.4} />
      ))}
    </Frame>
  );
}

function LargeFormatArt() {
  return (
    <Frame label="Illustration: großformatiges Banner mit Ösen">
      <path d="M40 40V270M360 40V270" strokeWidth={2} strokeOpacity={0.5} />
      <g className={cn(transition, "group-hover:scale-y-[1.03]")} style={{ transformOrigin: "200px 60px" }}>
        <path d="M58 60Q200 70 342 60V200Q200 210 58 200Z" fill="currentColor" fillOpacity={0.07} strokeWidth={1.75} />
        {[70, 200, 330].map((x) => (
          <g key={x}>
            <circle cx={x} cy={x === 200 ? 74 : 72} r={4.5} />
            <circle cx={x} cy={x === 200 ? 190 : 188} r={4.5} />
          </g>
        ))}
        <path d="M44 72L66 72M334 72L356 72M44 188L66 188M334 188L356 188" strokeOpacity={0.5} />
        <text x={90} y={140} fill="currentColor" stroke="none" fontSize={42} fontWeight={600} style={{ fontFamily: "var(--font-display)" }}>
          XXL
        </text>
        <path d="M200 112h110M200 128h80" strokeWidth={4} />
        <path d="M200 150h60" stroke={A} strokeWidth={4} />
        <path d="M266 150h44" stroke={B} strokeWidth={4} />
        <path d="M90 168h220" strokeOpacity={0.3} />
      </g>
      <path d="M20 270H380" strokeOpacity={0.35} />
    </Frame>
  );
}

function TextileArt() {
  return (
    <Frame label="Illustration: T-Shirt mit Druckbereich">
      <g className={cn(transition, "group-hover:-translate-y-2")}>
        <path
          d="M150 52c10 14 30 22 50 22s40-8 50-22l64 26 26 58-40 16-14-24v128H114V128l-14 24-40-16 26-58z"
          fill="currentColor"
          fillOpacity={0.06}
          strokeWidth={1.75}
        />
        <path d="M150 52c10 14 30 22 50 22s40-8 50-22" strokeOpacity={0.6} />
        <rect x={150} y={108} width={100} height={100} strokeDasharray="4 5" strokeOpacity={0.5} />
        <circle cx={200} cy={150} r={24} strokeWidth={2.5} />
        <path d="M189 150h22" strokeWidth={2.5} />
        <path d="M168 190h40" stroke={A} strokeWidth={4} />
        <path d="M212 190h20" stroke={B} strokeWidth={4} />
      </g>
      <Crop x={150} y={108} w={100} h={100} o={8} />
    </Frame>
  );
}

function PromoArt() {
  return (
    <Frame label="Illustration: konturgeschnittene Aufkleber">
      <rect x={60} y={50} width={280} height={200} rx={8} strokeOpacity={0.35} />
      <g className={cn(transition, "group-hover:-rotate-6")} style={{ transformOrigin: "140px 130px" }}>
        <circle cx={140} cy={130} r={46} fill="currentColor" fillOpacity={0.08} strokeWidth={1.75} />
        <circle cx={140} cy={130} r={54} strokeDasharray="3 5" strokeOpacity={0.55} />
        <circle cx={140} cy={130} r={16} strokeWidth={2.25} />
        <path d="M132 130h16" strokeWidth={2.25} />
      </g>
      <g className={cn(transition, "group-hover:translate-x-2 group-hover:-translate-y-2")}>
        <rect x={214} y={84} width={96} height={56} rx={14} fill={B} stroke="none" />
        <rect x={207} y={77} width={110} height={70} rx={20} strokeDasharray="3 5" strokeOpacity={0.55} />
        <path d="M232 106h56M232 120h34" stroke="var(--color-ink)" strokeWidth={3} />
      </g>
      <g className={cn(transition, "group-hover:rotate-12")} style={{ transformOrigin: "262px 200px" }}>
        <path
          d="M262 166l9 20 21-6-6 21 20 9-20 9 6 21-21-6-9 20-9-20-21 6 6-21-20-9 20-9-6-21 21 6z"
          fill="currentColor"
          fillOpacity={0.08}
          strokeWidth={1.5}
        />
      </g>
      <path d="M86 214q20-6 30 10" strokeOpacity={0.5} />
    </Frame>
  );
}

const ART: Record<ServiceArtVariant, () => React.ReactElement> = {
  design: DesignArt,
  print: PrintArt,
  signage: SignageArt,
  vehicle: VehicleArt,
  letters: LettersArt,
  largeformat: LargeFormatArt,
  textile: TextileArt,
  promo: PromoArt,
};

export default function ServiceArt({ variant, className }: { variant: ServiceArtVariant; className?: string }) {
  const Component = ART[variant];
  return (
    <div className={cn("h-full w-full", className)}>
      <Component />
    </div>
  );
}
