export type OrderDocumentEmailActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const ORDER_DOCUMENT_EMAIL_INITIAL_STATE: OrderDocumentEmailActionState = {
  status: "idle",
  message: "",
};
