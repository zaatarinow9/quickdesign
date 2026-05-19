"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/admin/auth";
import { sendSmtpMail } from "@/lib/email/smtp";
import { normalizeEmailAddress } from "@/lib/email/address";
import {
  getConfiguredAppBaseUrl,
  getPublicAppBaseUrl,
  isProductionEnvironment,
} from "@/lib/env";
import {
  buildOrderDocumentEmailText,
  formatDocumentNumber,
  getOrderDocumentDetails,
} from "@/lib/orders/document-content";
import { type OrderDocumentEmailActionState } from "@/lib/orders/document-email";
import {
  buildSharedOrderDocumentHref,
  parseOrderDocumentQueryType,
  type OrderDocumentQueryType,
} from "@/lib/orders/documents";
import { createOrderDocumentShareToken } from "@/lib/orders/document-share";
import { prisma } from "@/lib/prisma";

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function resolveAppBaseUrl(): Promise<string> {
  const configuredBaseUrl = getConfiguredAppBaseUrl();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (isProductionEnvironment()) {
    return getPublicAppBaseUrl();
  }

  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host");
  const host = forwardedHost || headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") || "http";

  if (host) {
    return `${protocol}://${host}`;
  }

  return getPublicAppBaseUrl();
}

function buildSuccessMessage(
  documentType: OrderDocumentQueryType,
  recipient: string,
): string {
  switch (documentType) {
    case "invoice":
      return `Rechnung wurde an ${recipient} gesendet.`;
    case "offer":
      return `Angebot wurde an ${recipient} gesendet.`;
    case "order":
    default:
      return `Auftrag wurde an ${recipient} gesendet.`;
  }
}

export async function sendOrderDocumentEmail(
  _previousState: OrderDocumentEmailActionState,
  formData: FormData,
): Promise<OrderDocumentEmailActionState> {
  const currentUser = await requireAdminPermission("canManageOrders");
  const orderId = getFormString(formData, "orderId");
  const documentType = parseOrderDocumentQueryType(
    getFormString(formData, "documentType"),
  );
  const recipient = normalizeEmailAddress(getFormString(formData, "recipient"));
  const subject = getFormString(formData, "subject");
  const customMessage = getFormString(formData, "message");

  if (!orderId || !documentType) {
    return {
      status: "error",
      message: "Dokumenttyp oder Auftrags-ID ist ungueltig.",
    };
  }

  if (!recipient) {
    return {
      status: "error",
      message: "Bitte geben Sie eine gueltige Empfaenger-E-Mail ein.",
    };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      invoiceNumber: true,
      invoiceDate: true,
      dueDate: true,
      createdAt: true,
      documentType: true,
      customerName: true,
      customerEmail: true,
      subtotalNet: true,
      discountType: true,
      discountValue: true,
      discountAmount: true,
      taxRate: true,
      taxAmount: true,
      totalNet: true,
      totalGross: true,
      totalAmount: true,
      currency: true,
      paymentStatus: true,
      status: true,
    },
  });

  if (!order) {
    return {
      status: "error",
      message: "Der Auftrag wurde nicht gefunden.",
    };
  }

  try {
    const baseUrl = await resolveAppBaseUrl();
    const shareToken = createOrderDocumentShareToken({
      orderId: order.id,
      type: documentType,
    });
    const shareHref = buildSharedOrderDocumentHref(
      order.id,
      documentType,
      shareToken.expires,
      shareToken.signature,
    );
    const shareUrl = new URL(shareHref, baseUrl).toString();
    const documentDetails = getOrderDocumentDetails(order, documentType);
    const resolvedSubject =
      subject ||
      `${documentDetails.definition.label} ${documentDetails.documentNumber}`;
    const emailText = buildOrderDocumentEmailText({
      customerName: order.customerName,
      documentLabel: documentDetails.definition.label,
      documentNumber: formatDocumentNumber(order.invoiceNumber, order.orderNumber),
      shareUrl,
      customMessage,
    });

    await sendSmtpMail({
      to: recipient,
      subject: resolvedSubject,
      text: emailText,
    });

    await prisma.orderActivity.create({
      data: {
        orderId: order.id,
        adminUserId: currentUser.id,
        type: "DOCUMENT_EMAIL_SENT",
        message: `${currentUser.name} hat ${documentDetails.definition.label.toLowerCase()} ${documentDetails.documentNumber} an ${recipient} gesendet.`,
      },
    });

    revalidatePath(`/admin/orders/${order.id}`);
    revalidatePath(`/admin/orders/${order.id}/document`);

    return {
      status: "success",
      message: `${buildSuccessMessage(documentType, recipient)} Der Versand enthaelt aktuell einen sicheren Dokumentlink statt eines PDF-Anhangs.`,
    };
  } catch (error) {
    console.error("Failed to send order document email.", error);

    return {
      status: "error",
      message:
        "Die E-Mail konnte nicht gesendet werden. Bitte pruefen Sie SMTP- und App-Konfiguration und versuchen Sie es erneut.",
    };
  }
}
