import { buildBrandImageResponse } from "@/lib/branding/image-response";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default async function Icon() {
  return buildBrandImageResponse(size.width, size.height);
}
