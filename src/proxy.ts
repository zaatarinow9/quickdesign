import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MAIN_HOSTS, SHOP_HOSTS, SHOP_URL } from "@/lib/shop/config";

/* ------------------------------ Shop (Subdomain) ------------------------------ */

const hostOf = (request: NextRequest) => (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0].toLowerCase();

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
    // Shop-Verwaltung wird separat in proxy() behandelt
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
    if (pathname.startsWith("/shop-admin")) return NextResponse.redirect(new URL(`/admin${pathname.slice(11)}${search}`, request.url));
    if (pathname === "/shop" || pathname.startsWith("/shop/")) {
      return NextResponse.redirect(new URL(`${pathname.slice(5) || "/"}${search}`, request.url), 308);
    }
    // Der Shop ist nur auf Arabisch: alte /de-Links und Pfade ohne Sprache → /ar
    if (pathname === "/") return NextResponse.redirect(new URL(`/ar${search}`, request.url));
    const first = pathname.split("/")[1];
    if (first === "de") return NextResponse.redirect(new URL(`/ar${pathname.slice(3)}${search}`, request.url), 308);
    if (first !== "ar") return NextResponse.redirect(new URL(`/ar${pathname}${search}`, request.url));
    const url = request.nextUrl.clone();
    url.pathname = `/shop${pathname}`;
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/shop-admin") && MAIN_HOSTS.includes(host)) {
    return NextResponse.redirect(new URL(`${SHOP_URL}/admin${pathname.slice(11)}${search}`));
  }
  if (pathname === "/shop" || pathname.startsWith("/shop/")) {
    const rest = pathname.slice(5);
    if (MAIN_HOSTS.includes(host)) return NextResponse.redirect(new URL(`${SHOP_URL}${rest || "/"}${search}`), 308);
    // Vorschau / lokal: nur Arabisch
    if (!rest || rest === "/") return NextResponse.redirect(new URL(`/shop/ar${search}`, request.url));
    if (rest === "/de" || rest.startsWith("/de/")) return NextResponse.redirect(new URL(`/shop/ar${rest.slice(3)}${search}`, request.url), 308);
    return NextResponse.next();
  }
  return null;
}

/** Supabase-Session im Proxy auffrischen (HttpOnly-Cookies) und angemeldeten Nutzer liefern */
async function withSession(request: NextRequest, build: () => NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let response = build();
  if (!url || !key) return { response, user: null };
  const supabase = createServerClient(url, key, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = build();
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  // getClaims prüft das Token lokal (und erneuert es bei Bedarf) – kein zusätzlicher Weg zum Anmeldeserver
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return { response, user: sub ? { id: sub } : null };
}

function privateHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function redirectWithCookies(target: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(target);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

/**
 * Schützt die Verwaltungsbereiche: aktualisiert die Supabase-Session und leitet
 * nicht angemeldete Besucher zum Login um. Die eigentliche Berechtigungsprüfung
 * (Rolle, 2FA bzw. Shop-Zugang) erfolgt zusätzlich serverseitig in jeder Seite und Aktion.
 */
export async function proxy(request: NextRequest) {
  const shop = shopRouting(request);
  if (shop) return shop;
  const { pathname } = request.nextUrl;
  const isShopHost = SHOP_HOSTS.includes(hostOf(request));

  // Shop-Verwaltung: shop.quickdesign24.de/admin → intern /shop-admin; in Vorschau direkt /shop-admin
  const shopAdminRest =
    isShopHost && (pathname === "/admin" || pathname.startsWith("/admin/")) ? pathname.slice(6) : pathname.startsWith("/shop-admin") ? pathname.slice(11) : null;
  if (shopAdminRest !== null) {
    const base = isShopHost ? "/admin" : "/shop-admin";
    const build = () => {
      if (!isShopHost) return NextResponse.next({ request });
      const url = request.nextUrl.clone();
      url.pathname = `/shop-admin${shopAdminRest}`;
      return NextResponse.rewrite(url, { request });
    };
    const { response, user } = await withSession(request, build);
    if (!user && !shopAdminRest.startsWith("/login")) return redirectWithCookies(new URL(`${base}/login`, request.url), response);
    return privateHeaders(response);
  }

  if (!pathname.startsWith("/admin")) return NextResponse.next();
  const isLogin = pathname.startsWith("/admin/login");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return isLogin ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login", request.url));
  }
  const { response, user } = await withSession(request, () => NextResponse.next({ request }));
  if (!user && !isLogin) {
    const r = redirectWithCookies(new URL("/admin/login", request.url), response);
    // geteilter Link (Datei/Ordner): nach der Anmeldung dorthin zurück – nur Pfade innerhalb der Verwaltung
    const target = `${pathname}${request.nextUrl.search}`;
    if (pathname !== "/admin" && target.length < 1500) r.cookies.set("qd_weiter", target, { httpOnly: true, secure: true, sameSite: "lax", path: "/admin", maxAge: 900 });
    return r;
  }
  return privateHeaders(response);
}

export const config = {
  // Alle Seiten außer Next-Interna, API und Dateien mit Endung (Bilder, Schriften …)
  matcher: ["/((?!api/|_next/|opengraph-image|apple-icon|icon|.*\\.[a-zA-Z0-9]{2,5}$).*)"],
};
