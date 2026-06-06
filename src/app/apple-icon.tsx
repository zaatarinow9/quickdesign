import { buildBrandImageResponse } from "@/lib/branding/image-response";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default async function AppleIcon() {
  return buildBrandImageResponse(size.width, size.height);
}
