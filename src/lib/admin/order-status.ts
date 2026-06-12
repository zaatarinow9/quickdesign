type OrderStatusMeta = {
  label: string;
  badgeClassName: string;
};

export function getOrderStatusMeta(status: string): OrderStatusMeta {
  switch (status) {
    case "PROCESSING":
      return {
        label: "In Bearbeitung",
        badgeClassName:
          "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/50 dark:text-amber-200",
      };
    case "SHIPPED":
      return {
        label: "Versendet",
        badgeClassName:
          "border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/80 dark:bg-violet-950/50 dark:text-violet-200",
      };
    case "DELIVERED":
      return {
        label: "Abgeschlossen",
        badgeClassName:
          "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/50 dark:text-emerald-200",
      };
    case "CANCELED":
      return {
        label: "Storniert",
        badgeClassName:
          "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/50 dark:text-rose-200",
      };
    case "PAID":
    default:
      return {
        label: "Neu",
        badgeClassName:
          "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/80 dark:bg-sky-950/50 dark:text-sky-200",
      };
  }
}

export function getInternalOrderStatusMeta(status: string): OrderStatusMeta {
  switch (status) {
    case "IN_REVIEW":
      return {
        label: "In Prüfung",
        badgeClassName:
          "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/80 dark:bg-sky-950/50 dark:text-sky-200",
      };
    case "IN_PRODUCTION":
      return {
        label: "In Produktion",
        badgeClassName:
          "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/50 dark:text-amber-200",
      };
    case "WAITING_CUSTOMER":
      return {
        label: "Wartet auf Kunde",
        badgeClassName:
          "border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/80 dark:bg-violet-950/50 dark:text-violet-200",
      };
    case "READY":
      return {
        label: "Bereit",
        badgeClassName:
          "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/50 dark:text-emerald-200",
      };
    case "DONE":
      return {
        label: "Erledigt",
        badgeClassName:
          "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/50 dark:text-emerald-200",
      };
    case "NEW":
    default:
      return {
        label: "Neu",
        badgeClassName:
          "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/80 dark:bg-sky-950/50 dark:text-sky-200",
      };
  }
}
