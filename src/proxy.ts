import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MAIN_HOSTS, SHOP_HOSTS, SHOP_URL } from "@/lib/shop/config";

/* ------------------------------ Shop (Subdomain) ------------------------------ */

const hostOf = (request: NextRequest) => (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0].toLowerCase();
const preferredLang = (request: NextRequest) => {
  const al = (request.headers.get("accept-language") ?? "").toLowerCase();
  // Arabisch nur, wenn es vor Deutsch/Englisch bevorzugt wird
  const ar = al.search(/(^|,)\s*ar\b/);
  const other = al.search(/(^|,)\s*(de|en)\b/);
  return ar !== -1 && (other === -1 || ar < other) ? "ar" : "de";
};

/**
 * shop.quickdesign24.de/…  → intern /shop/…  (Rewrite, Adresse bleibt sauber)
 * quickdesign24.de/shop/… → 308 auf shop.quickdesign24.de/… (kein doppelter Inhalt)
 * Auf Vorschau-Domains (*.vercel.app) und lokal bleibt /shop/… direkt erreichbar.
 */
function shopRouting(request: NextRequest): NextResponse | null {
  const host = hostOf(request);
  const { pathname, search } = request.nextUrl;
  const isShopHost = SHOP_HOSTS.includes(host);

  if (isShopHost) {
    // Verwaltung und Hauptseite gehören auf die Hauptdomain
    if (pathname.startsWith("/admin")) return NextResponse.redirect(new URL(`https://quickdesign24.de${pathname}${search}`));
    if (pathname === "/shop" || pathname.startsWith("/shop/")) {
      return NextResponse.redirect(new URL(`${pathname.slice(5) || "/"}${search}`, request.url), 308);
    }
    if (pathname === "/") return NextResponse.redirect(new URL(`/${preferredLang(request)}${search}`, request.url));
    const first = pathname.split("/")[1];
    if (first !== "de" && first !== "ar") return NextResponse.redirect(new URL(`/de${pathname}${search}`, request.url));
    const url = request.nextUrl.clone();
    url.pathname = `/shop${pathname}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === "/shop" || pathname.startsWith("/shop/")) {
    const rest = pathname.slice(5);
    if (MAIN_HOSTS.includes(host)) return NextResponse.redirect(new URL(`${SHOP_URL}${rest || "/"}${search}`), 308);
    // Vorschau / lokal: Sprache ergänzen
    if (!rest || rest === "/") return NextResponse.redirect(new URL(`/shop/${preferredLang(request)}${search}`, request.url));
    return NextResponse.next();
  }
  return null;
}

/**
 * Schützt den Verwaltungsbereich: aktualisiert die Supabase-Session und leitet
 * nicht angemeldete Besucher zum Login um. Die eigentliche Berechtigungsprüfung
 * (Rolle, 2FA) erfolgt zusätzlich serverseitig in jeder Seite und Aktion.
 */
export async function proxy(request: NextRequest) {
  const shop = shopRouting(request);
  if (shop) return shop;
  if (!request.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const isLogin = request.nextUrl.pathname.startsWith("/admin/login");

  if (!url || !key) {
    return isLogin ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  if (!data.user && !isLogin) {
    const redirect = NextResponse.redirect(new URL("/admin/login", request.url));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Alle Seiten außer Next-Interna, API und Dateien mit Endung (Bilder, Schriften …)
  matcher: ["/((?!api/|_next/|opengraph-image|apple-icon|icon|.*\\.[a-zA-Z0-9]{2,5}$).*)"],
};
