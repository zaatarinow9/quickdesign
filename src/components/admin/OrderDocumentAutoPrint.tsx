"use client";

import { useEffect } from "react";

export function OrderDocumentAutoPrint({
  enabled,
}: {
  enabled: boolean;
}) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.print();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [enabled]);

  return null;
}
