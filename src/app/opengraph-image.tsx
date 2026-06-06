import { buildBrandImageResponse } from "@/lib/branding/image-response";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpenGraphImage() {
  return buildBrandImageResponse(size.width, size.height);
}
