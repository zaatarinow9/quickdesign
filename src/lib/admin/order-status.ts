type OrderStatusMeta = {
  label: string;
  badgeClassName: string;
};

export function getOrderStatusMeta(status: string): OrderStatusMeta {
  switch (status) {
    case "PROCESSING":
      return {
        label: "In Bearbeitung",
        badgeClassName: "border border-amber-200 bg-amber-50 text-amber-700",
      };
    case "SHIPPED":
      return {
        label: "Versendet",
        badgeClassName: "border border-violet-200 bg-violet-50 text-violet-700",
      };
    case "DELIVERED":
      return {
        label: "Abgeschlossen",
        badgeClassName:
          "border border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "CANCELED":
      return {
        label: "Storniert",
        badgeClassName: "border border-rose-200 bg-rose-50 text-rose-700",
      };
    case "PAID":
    default:
      return {
        label: "Neu",
        badgeClassName: "border border-sky-200 bg-sky-50 text-sky-700",
      };
  }
}

export function getInternalOrderStatusMeta(status: string): OrderStatusMeta {
  switch (status) {
    case "IN_REVIEW":
      return {
        label: "In Pruefung",
        badgeClassName: "border border-sky-200 bg-sky-50 text-sky-700",
      };
    case "IN_PRODUCTION":
      return {
        label: "In Produktion",
        badgeClassName: "border border-amber-200 bg-amber-50 text-amber-700",
      };
    case "WAITING_CUSTOMER":
      return {
        label: "Wartet auf Kunde",
        badgeClassName: "border border-violet-200 bg-violet-50 text-violet-700",
      };
    case "READY":
      return {
        label: "Bereit",
        badgeClassName: "border border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "DONE":
      return {
        label: "Erledigt",
        badgeClassName:
          "border border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "NEW":
    default:
      return {
        label: "Neu",
        badgeClassName: "border border-sky-200 bg-sky-50 text-sky-700",
      };
  }
}
