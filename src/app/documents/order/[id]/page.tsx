import { notFound } from "next/navigation";
import {
  OrderDocumentPageStyles,
  OrderDocumentSheet,
} from "@/components/admin/OrderDocumentSheet";
import { getOrderDocumentRecord } from "@/lib/orders/document-content";
import {
  parseOrderDocumentQueryType,
  type OrderDocumentQueryType,
} from "@/lib/orders/documents";
import { verifyOrderDocumentShareToken } from "@/lib/orders/document-share";

function resolveSharedDocumentType(value: string | undefined): OrderDocumentQueryType | null {
  return parseOrderDocumentQueryType(value);
}

export default async function SharedOrderDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    type?: string;
    expires?: string;
    signature?: string;
  }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const documentType = resolveSharedDocumentType(resolvedSearchParams.type);

  if (!documentType) {
    return notFound();
  }

  const isValidShareLink = verifyOrderDocumentShareToken({
    orderId: id,
    type: documentType,
    expires: resolvedSearchParams.expires,
    signature: resolvedSearchParams.signature,
  });

  if (!isValidShareLink) {
    return notFound();
  }

  const order = await getOrderDocumentRecord(id);

  if (!order) {
    return notFound();
  }

  return (
    <div className="order-document-shell min-h-screen bg-neutral-100 px-4 py-8 text-neutral-950 print:bg-white print:px-0 print:py-0">
      <OrderDocumentPageStyles />
      <div className="mx-auto w-full max-w-[220mm]">
        <OrderDocumentSheet
          order={order}
          documentQueryType={documentType}
          viewer="shared"
        />
      </div>
    </div>
  );
}
