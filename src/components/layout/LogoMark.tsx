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
    sizes: string;
  }
> = {
  header: {
    frame: "h-8 w-[132px] sm:h-9 sm:w-[148px]",
    image: "object-contain object-left",
    sizes: "148px",
  },
  compact: {
    frame: "h-8 w-[128px] sm:h-9 sm:w-[140px]",
    image: "object-contain object-left",
    sizes: "140px",
  },
  sidebar: {
    frame: "h-9 w-[148px] sm:h-10 sm:w-[164px]",
    image: "object-contain object-left",
    sizes: "164px",
  },
  document: {
    frame: "h-10 w-[168px]",
    image: "object-contain object-left",
    sizes: "168px",
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
        "relative inline-flex items-center justify-start overflow-hidden",
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
          sizes={SIZE_STYLES[size].sizes}
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
