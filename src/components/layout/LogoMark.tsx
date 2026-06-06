"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoMarkSize = "header" | "compact" | "sidebar" | "document";

const SIZE_STYLES: Record<
  LogoMarkSize,
  {
    frame: string;
    image: string;
  }
> = {
  header: {
    frame: "h-12 w-[170px] rounded-2xl px-3 py-2 sm:h-14 sm:w-[188px]",
    image: "object-contain object-left",
  },
  compact: {
    frame: "h-10 w-[144px] rounded-xl px-3 py-2",
    image: "object-contain object-left",
  },
  sidebar: {
    frame: "h-14 w-[196px] rounded-2xl px-3 py-2",
    image: "object-contain object-left",
  },
  document: {
    frame: "h-16 w-[220px] rounded-2xl px-3 py-2",
    image: "object-contain object-left",
  },
};

type LogoMarkProps = {
  href?: string;
  priority?: boolean;
  size?: LogoMarkSize;
  className?: string;
  frameClassName?: string;
  labelClassName?: string;
  showLabel?: boolean;
};

export default function LogoMark({
  href,
  priority = false,
  size = "header",
  className,
  frameClassName,
  labelClassName,
  showLabel = false,
}: LogoMarkProps) {
  const frame = (
    <span
      className={cn(
        "inline-flex items-center border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/4 dark:border-white/10 dark:bg-white",
        SIZE_STYLES[size].frame,
        frameClassName,
      )}
    >
      <span className="relative block h-full w-full">
        <Image
          src="/logo.png"
          alt="QuickDesign"
          fill
          priority={priority}
          className={cn("select-none", SIZE_STYLES[size].image)}
          sizes="220px"
        />
      </span>
    </span>
  );

  const content = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      {frame}
      {showLabel ? (
        <span
          className={cn(
            "hidden text-sm font-medium text-slate-600 sm:inline dark:text-slate-300",
            labelClassName,
          )}
        >
          Druck, Werbetechnik und Bestellmanagement
        </span>
      ) : null}
    </span>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center"
      aria-label="QuickDesign Startseite"
    >
      {content}
    </Link>
  );
}
