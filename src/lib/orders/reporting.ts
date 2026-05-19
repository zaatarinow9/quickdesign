import { format } from "date-fns";
import {
  getOrderFinancials,
  getOrderPaymentStatus,
  normalizeNonNegativeNumber,
} from "@/lib/orders/finance";

export type ReportableOrderItem = {
  serviceId: string;
  serviceName: string;
  quantity: number;
  price: number;
};

export type ReportableOrder = {
  id: string;
  orderNumber: number;
  customerName: string;
  customerEmail?: string | null;
  customerId?: string | null;
  status: string;
  internalStatus?: string | null;
  paymentStatus?: string | null;
  totalAmount: number;
  subtotalNet?: number | null;
  discountType?: string | null;
  discountValue?: number | null;
  discountAmount?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  totalNet?: number | null;
  totalGross?: number | null;
  currency?: string | null;
  paidAmount?: number | null;
  documentType?: string | null;
  priority?: string | null;
  assignedToId?: string | null;
  createdAt: Date;
  isArchived?: boolean | null;
  items?: ReportableOrderItem[];
  customer?: {
    companyName?: string | null;
  } | null;
  assignedTo?: {
    name: string;
    role?: string;
  } | null;
};

export type StaffWorkloadUser = {
  id: string;
  name: string;
  role: string;
};

export type OrdersSummary = {
  totalOrders: number;
  openOrders: number;
  completedOrders: number;
  canceledOrders: number;
  unpaidOrders: number;
  totalNet: number;
  totalGross: number;
  totalTax: number;
  totalDiscount: number;
  paidAmount: number;
  unpaidAmount: number;
};

export type SummaryBreakdownRow = {
  key: string;
  count: number;
  totalNet: number;
  totalGross: number;
};

export type TopServiceRow = {
  serviceId: string;
  serviceName: string;
  ordersCount: number;
  quantity: number;
  totalNet: number;
};

export type TopCustomerRow = {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  ordersCount: number;
  totalNet: number;
  totalGross: number;
};

export type StaffWorkloadRow = {
  adminUserId: string;
  name: string;
  role: string;
  assignedOrdersCount: number;
  completedAssignedOrdersCount: number;
  openAssignedOrdersCount: number;
  totalNet: number;
  totalGross: number;
};

export type MonthRange = {
  monthValue: string;
  monthLabel: string;
  from: Date;
  toExclusive: Date;
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeMonthInput(monthValue: string | null | undefined): {
  year: number;
  monthIndex: number;
} | null {
  const match = monthValue?.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return {
    year,
    monthIndex: month - 1,
  };
}

export function getMonthRange(monthValue?: string | null): MonthRange {
  const normalizedMonth = normalizeMonthInput(monthValue);
  const baseDate = normalizedMonth
    ? new Date(normalizedMonth.year, normalizedMonth.monthIndex, 1)
    : new Date();
  const from = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const toExclusive = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);

  return {
    monthValue: format(from, "yyyy-MM"),
    monthLabel: format(from, "MMMM yyyy"),
    from,
    toExclusive,
  };
}

export function isOrderCompleted(order: {
  status: string;
  internalStatus?: string | null;
}): boolean {
  return order.status === "DELIVERED" || order.internalStatus === "DONE";
}

export function isOrderCanceled(order: { status: string }): boolean {
  return order.status === "CANCELED";
}

export function isOrderClosed(order: {
  status: string;
  internalStatus?: string | null;
}): boolean {
  return isOrderCompleted(order) || isOrderCanceled(order);
}

export function canArchiveOrder(order: {
  status: string;
  internalStatus?: string | null;
  isArchived?: boolean | null;
}): boolean {
  return !order.isArchived && isOrderClosed(order);
}

export function getOrderPaidAmount(order: ReportableOrder): number {
  const financials = getOrderFinancials(order);
  const paymentStatus = getOrderPaymentStatus(order);
  const storedPaidAmount = normalizeNonNegativeNumber(order.paidAmount);

  switch (paymentStatus) {
    case "PAID":
    case "REFUNDED":
      return financials.totalGross;
    case "PARTIALLY_PAID":
      return Math.min(financials.totalGross, storedPaidAmount);
    case "UNPAID":
    default:
      return 0;
  }
}

export function getOrderOutstandingAmount(order: ReportableOrder): number {
  const financials = getOrderFinancials(order);
  return Math.max(0, roundCurrency(financials.totalGross - getOrderPaidAmount(order)));
}

export function buildOrdersSummary(orders: ReportableOrder[]): OrdersSummary {
  return orders.reduce<OrdersSummary>(
    (summary, order) => {
      const financials = getOrderFinancials(order);
      const outstandingAmount = getOrderOutstandingAmount(order);

      summary.totalOrders += 1;
      summary.openOrders += isOrderClosed(order) ? 0 : 1;
      summary.completedOrders += isOrderCompleted(order) ? 1 : 0;
      summary.canceledOrders += isOrderCanceled(order) ? 1 : 0;
      summary.unpaidOrders += outstandingAmount > 0 ? 1 : 0;
      summary.totalNet = roundCurrency(summary.totalNet + financials.totalNet);
      summary.totalGross = roundCurrency(summary.totalGross + financials.totalGross);
      summary.totalTax = roundCurrency(summary.totalTax + financials.taxAmount);
      summary.totalDiscount = roundCurrency(
        summary.totalDiscount + financials.discountAmount,
      );
      summary.paidAmount = roundCurrency(
        summary.paidAmount + getOrderPaidAmount(order),
      );
      summary.unpaidAmount = roundCurrency(
        summary.unpaidAmount + outstandingAmount,
      );

      return summary;
    },
    {
      totalOrders: 0,
      openOrders: 0,
      completedOrders: 0,
      canceledOrders: 0,
      unpaidOrders: 0,
      totalNet: 0,
      totalGross: 0,
      totalTax: 0,
      totalDiscount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
    },
  );
}

export function buildStatusBreakdown(
  orders: ReportableOrder[],
): SummaryBreakdownRow[] {
  const statusMap = new Map<string, SummaryBreakdownRow>();

  orders.forEach((order) => {
    const financials = getOrderFinancials(order);
    const currentRow = statusMap.get(order.status) ?? {
      key: order.status,
      count: 0,
      totalNet: 0,
      totalGross: 0,
    };

    currentRow.count += 1;
    currentRow.totalNet = roundCurrency(currentRow.totalNet + financials.totalNet);
    currentRow.totalGross = roundCurrency(
      currentRow.totalGross + financials.totalGross,
    );
    statusMap.set(order.status, currentRow);
  });

  return Array.from(statusMap.values()).sort((left, right) => right.count - left.count);
}

export function buildPaymentStatusBreakdown(
  orders: ReportableOrder[],
): SummaryBreakdownRow[] {
  const statusMap = new Map<string, SummaryBreakdownRow>();

  orders.forEach((order) => {
    const paymentStatus = getOrderPaymentStatus(order);
    const financials = getOrderFinancials(order);
    const currentRow = statusMap.get(paymentStatus) ?? {
      key: paymentStatus,
      count: 0,
      totalNet: 0,
      totalGross: 0,
    };

    currentRow.count += 1;
    currentRow.totalNet = roundCurrency(currentRow.totalNet + financials.totalNet);
    currentRow.totalGross = roundCurrency(
      currentRow.totalGross + financials.totalGross,
    );
    statusMap.set(paymentStatus, currentRow);
  });

  return Array.from(statusMap.values()).sort((left, right) => right.count - left.count);
}

export function buildTopServices(
  orders: ReportableOrder[],
  limit = 5,
): TopServiceRow[] {
  const serviceMap = new Map<string, TopServiceRow>();

  orders.forEach((order) => {
    order.items?.forEach((item) => {
      const currentRow = serviceMap.get(item.serviceId) ?? {
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        ordersCount: 0,
        quantity: 0,
        totalNet: 0,
      };

      currentRow.ordersCount += 1;
      currentRow.quantity += item.quantity;
      currentRow.totalNet = roundCurrency(currentRow.totalNet + item.price);
      serviceMap.set(item.serviceId, currentRow);
    });
  });

  return Array.from(serviceMap.values())
    .sort((left, right) => {
      if (right.totalNet === left.totalNet) {
        return right.quantity - left.quantity;
      }

      return right.totalNet - left.totalNet;
    })
    .slice(0, limit);
}

export function buildTopCustomers(
  orders: ReportableOrder[],
  limit = 5,
): TopCustomerRow[] {
  const customerMap = new Map<string, TopCustomerRow>();

  orders.forEach((order) => {
    const financials = getOrderFinancials(order);
    const customerKey =
      order.customerId ?? `${order.customerName}:${order.customerEmail ?? "legacy"}`;
    const currentRow = customerMap.get(customerKey) ?? {
      id: customerKey,
      name: order.customerName,
      companyName: order.customer?.companyName ?? null,
      email: order.customerEmail ?? null,
      ordersCount: 0,
      totalNet: 0,
      totalGross: 0,
    };

    currentRow.ordersCount += 1;
    currentRow.totalNet = roundCurrency(currentRow.totalNet + financials.totalNet);
    currentRow.totalGross = roundCurrency(
      currentRow.totalGross + financials.totalGross,
    );
    customerMap.set(customerKey, currentRow);
  });

  return Array.from(customerMap.values())
    .sort((left, right) => {
      if (right.totalGross === left.totalGross) {
        return right.ordersCount - left.ordersCount;
      }

      return right.totalGross - left.totalGross;
    })
    .slice(0, limit);
}

export function buildStaffWorkloadSummary(
  orders: ReportableOrder[],
  users: StaffWorkloadUser[],
): StaffWorkloadRow[] {
  const userMap = new Map<string, StaffWorkloadRow>(
    users.map((user) => [
      user.id,
      {
        adminUserId: user.id,
        name: user.name,
        role: user.role,
        assignedOrdersCount: 0,
        completedAssignedOrdersCount: 0,
        openAssignedOrdersCount: 0,
        totalNet: 0,
        totalGross: 0,
      },
    ]),
  );

  orders.forEach((order) => {
    if (!order.assignedToId) {
      return;
    }

    const workloadRow = userMap.get(order.assignedToId);
    if (!workloadRow) {
      return;
    }

    const financials = getOrderFinancials(order);

    workloadRow.assignedOrdersCount += 1;
    workloadRow.completedAssignedOrdersCount += isOrderCompleted(order) ? 1 : 0;
    workloadRow.openAssignedOrdersCount += isOrderClosed(order) ? 0 : 1;
    workloadRow.totalNet = roundCurrency(workloadRow.totalNet + financials.totalNet);
    workloadRow.totalGross = roundCurrency(
      workloadRow.totalGross + financials.totalGross,
    );
  });

  return Array.from(userMap.values()).sort((left, right) => {
    if (right.assignedOrdersCount === left.assignedOrdersCount) {
      return left.name.localeCompare(right.name);
    }

    return right.assignedOrdersCount - left.assignedOrdersCount;
  });
}
