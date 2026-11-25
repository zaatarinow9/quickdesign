"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Send, UserRound, X } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { money } from "@/lib/shop/format";
import { categoryKinds, preorderLive, resolveLine, type ResolvedLine } from "@/lib/shop/schema";
import { useShop } from "./ShopProvider";
import { cn } from "@/lib/utils";

const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z";

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={WA_PATH} />
    </svg>
  );
}

type Msg = { from: "bot" | "me"; text: string; staff?: boolean };
type Topic = { id: string; label: string; keys: string[]; answer: () => string };

/** Arabische Normalisierung für die Stichwortsuche (Hamza, Ta marbuta, Tashkeel) */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");

/**
 * Schneller Assistent: beantwortet häufige Fragen aus den Shop-Einstellungen und leitet bei Bedarf
 * mit einer vorbereiteten Nachricht an einen Mitarbeiter per WhatsApp weiter.
 */
export function ShopAssistant() {
  const { store, lines } = useShop();
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [hint, setHint] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const s = store.settings;
  const wa = s.whatsapp;

  // kleine Einladung nach ein paar Sekunden (einmal pro Sitzung)
  useEffect(() => {
    let shown = false;
    try {
      shown = sessionStorage.getItem("qd-assist-hint") === "1";
    } catch {}
    if (shown) return;
    const t = setTimeout(() => {
      setHint(true);
      try {
        sessionStorage.setItem("qd-assist-hint", "1");
      } catch {}
    }, 6000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, open]);

  // eslint-disable-next-line react-hooks/purity -- Datum für den Vorbestellrabatt
  const now = useMemo(() => Date.now(), []);
  const topics: Topic[] = useMemo(() => {
    const sh = s.shipping;
    const sizes = store.products.find((p) => p.sizeChart.length)?.sizeChart ?? [];
    return [
      {
        id: "pay",
        label: "طرق الدفع",
        keys: ["دفع", "ادفع", "بطاقه", "فيزا", "ماستر", "باي بال", "paypal", "كلارنا", "klarna", "ابل باي", "تقسيط", "visa"],
        answer: () => "يمكنك الدفع بالبطاقة البنكية (Visa / Mastercard) أو PayPal أو Apple Pay أو Google Pay أو Klarna – الدفع آمن عبر Stripe.",
      },
      {
        id: "ship",
        label: "مدة التوصيل",
        keys: ["توصيل", "شحن", "يوصل", "توصل", "متى", "كم يوم", "مده", "بوصل", "dhl", "تتاخر"],
        answer: () =>
          `الشحن العادي داخل ألمانيا ${money(sh.standardCents)} ويصل خلال ${sh.deliveryDays} أيام عمل${sh.freeFromCents ? `، ومجاني للطلبات فوق ${money(sh.freeFromCents)}` : ""}.${s.campaign.lastOrderDay ? ` ليصلك قبل 8 كانون الأول اطلب قبل ${s.campaign.lastOrderDay.split("-").reverse().join(".")}.` : ""}`,
      },
      ...(sh.express.enabled
        ? [
            {
              id: "express",
              label: "شحن سريع",
              keys: ["سريع", "مستعجل", "express", "اكسبرس", "عاجل", "بسرعه"],
              answer: () => `الشحن السريع ${money(sh.express.cents)} – نطبع طلبك بأولوية ويصلك خلال ${sh.express.days} أيام عمل. ويمكنك اختياره في صفحة الدفع.`,
            },
          ]
        : []),
      ...(sh.pickup.enabled
        ? [
            {
              id: "pickup",
              label: "الاستلام من المحل",
              keys: ["استلام", "استلم", "محل", "عنوان", "وين", "زاربروكن", "saarbr", "اجي", "ابوك"],
              answer: () => `نعم، الاستلام مجاني من محلنا: ${sh.pickup.address}. اختر «استلام» عند الدفع وسنبلغك فور جهوز طلبك.`,
            },
          ]
        : []),
      ...(preorderLive(s, now)
        ? [
            {
              id: "pre",
              label: "خصم عيد التحرير",
              keys: ["خصم", "عرض", "عروض", "تخفيض", "مسبق", "حسم", "كوبون", "اوفر"],
              answer: () => {
                const offers = store.offers.filter((o) => o.active).map((o) => o.name.ar || o.name.de);
                return `حالياً خصم ${s.preorder.pct}% على طلبك كاملاً بمناسبة عيد التحرير${s.preorder.until ? ` حتى ${s.preorder.until.split("-").reverse().join(".")}` : ""}.${offers.length ? ` إضافةً إلى: ${offers.join("، ")}.` : ""} ويُحتسب الخصم تلقائياً في السلة.`;
              },
            },
          ]
        : []),
      {
        id: "sizes",
        label: "المقاسات",
        keys: ["مقاس", "قياس", "مقاسات", "size", "لارج", "ميديوم", "سمول", "xl", "طول", "عرض"],
        answer: () =>
          sizes.length
            ? `التيشرتات قصّة للجنسين. مثلاً: ${sizes
                .slice(1, 5)
                .map((r) => `${r.size}: عرض ${r.width} سم × طول ${r.length} سم`)
                .join("، ")}. وجدول المقاسات الكامل متوفر في صفحة كل منتج.`
            : "جدول المقاسات متوفر في صفحة كل منتج.",
      },
      {
        id: "custom",
        label: "طلب خاص أو كمية كبيرة",
        keys: ["خاص", "اسم", "شعار", "لوغو", "جمعيه", "كميه", "جمله", "كثير", "تصميم", "تعديل", "مخصص"],
        answer: () => "بكل تأكيد. نطبع باسمك أو باسم جمعيتك وشعارها وبالكمية التي تحتاجها. اضغط «تحدث مع موظف» وأرسل إلينا التفاصيل.",
      },
      {
        id: "flags",
        label: "البنرات واللواصق",
        keys: ["علم", "اعلام", "لافته", "بانر", "ملصق", "ستيكر", "نسر", "سياره"],
        answer: () => {
          const n = store.products.filter((p) => p.active && [...categoryKinds.flags, ...categoryKinds.stickers].includes(p.kind)).length;
          return `لدينا ${n} منتجات: فليكس بنر بثلاثة مقاسات، لاصق سيارة «سوريا حرة»، لاصق النسر للسيارة والزجاج، وملصقات نافرة للجوال.`;
        },
      },
    ];
  }, [s, store, now]);

  const cartSummary = () => {
    const rows = lines.map((l) => resolveLine(store, l)).filter((x): x is ResolvedLine => !!x);
    if (!rows.length) return "";
    return "\n\nسلتي:\n" + rows.map((r) => `• ${r.qty}× ${r.product.name.ar || r.product.name.de} – ${[r.color?.name.ar, r.variant.label.ar].filter(Boolean).join(" · ")}`).join("\n");
  };
  const staffLink = (question?: string) => {
    const page = typeof window !== "undefined" ? window.location.href : pathname;
    const text = `مرحباً QuickDesign 👋\nعندي استفسار بخصوص متجر عيد التحرير.${question ? `\n\nسؤالي: ${question}` : ""}${cartSummary()}\n\nالصفحة: ${page}`;
    return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
  };

  const ask = (q: string, topic?: Topic) => {
    const text = q.trim();
    if (!text) return;
    const t = topic ?? topics.find((x) => x.keys.some((k) => norm(text).includes(norm(k))));
    const staffWords = ["موظف", "انسان", "شخص", "تكلم", "احكي", "اتصال", "اتصل", "واتس"];
    const wantsStaff = staffWords.some((k) => norm(text).includes(norm(k)));
    setMsgs((m) => [
      ...m,
      { from: "me", text },
      wantsStaff
        ? { from: "bot", text: "بكل سرور. اضغط على الزر أدناه لفتح محادثة واتساب مع أحد موظفينا، وستكون الرسالة جاهزة متضمنةً سؤالك ومحتوى سلتك.", staff: true }
        : t
          ? { from: "bot", text: t.answer() }
          : { from: "bot", text: "عذراً، لم أتمكن من فهم سؤالك بدقة 🙏 – هل تودّ التواصل مع أحد موظفينا مباشرة عبر واتساب؟", staff: true },
    ]);
    setInput("");
  };

  const greeting = "أهلاً وسهلاً 👋 أنا مساعد متجر عيد التحرير. اختر سؤالاً أو اكتب سؤالك، ويمكنني تحويلك إلى أحد موظفينا عبر واتساب.";
  const lastQuestion = [...msgs].reverse().find((m) => m.from === "me")?.text;

  return (
    <div className="fixed bottom-4 end-4 z-40 sm:bottom-6 sm:end-6" dir="rtl">
      {open ? (
        <div className="rise mb-3 flex h-[min(580px,calc(100svh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(5,40,35,0.45)] ring-1 ring-black/5" role="dialog" aria-label="مساعد المتجر">
          <div className="flex items-center gap-3 bg-[var(--green)] px-4 py-3.5 text-white">
            <span className="relative grid size-11 place-items-center rounded-full bg-white">
              <LogoMark className="w-8 text-[var(--ink)]" title="" />
              <span className="absolute -bottom-0.5 -end-0.5 size-3.5 rounded-full bg-[#25D366] ring-2 ring-[var(--green)]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-tight">QuickDesign · متجر عيد التحرير</p>
              <p className="text-xs text-white/75">المساعد الذكي · موظف متاح على واتساب</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-white/10" aria-label="إغلاق">
              <X className="size-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--paper-2)] p-4 text-[0.92rem] leading-relaxed">
            <div className="max-w-[88%] rounded-2xl rounded-ss-sm bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-black/5">{greeting}</div>
            {msgs.map((m, i) =>
              m.from === "me" ? (
                <div key={i} className="ms-auto max-w-[85%] rounded-2xl rounded-se-sm bg-[var(--green)] px-3.5 py-2.5 text-white">{m.text}</div>
              ) : (
                <div key={i} className="max-w-[88%] space-y-2">
                  <div className="rounded-2xl rounded-ss-sm bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-black/5">{m.text}</div>
                  {m.staff ? (
                    <a href={staffLink(lastQuestion)} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:brightness-105">
                      <WhatsAppIcon className="size-4" /> تحدث مع موظف
                    </a>
                  ) : null}
                </div>
              ),
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {topics.map((t) => (
                <button key={t.id} type="button" onClick={() => ask(t.label, t)} className="rounded-full bg-white px-3 py-1.5 text-[0.82rem] text-[var(--green)] ring-1 ring-[var(--green)]/25 transition hover:bg-[var(--mint)]">
                  {t.label}
                </button>
              ))}
            </div>
            <div ref={end} />
          </div>

          <div className="border-t border-[var(--line)] bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك هنا…"
                className="h-11 flex-1 rounded-full bg-[var(--paper-2)] px-4 text-[0.92rem] outline-none ring-1 ring-transparent focus:ring-[var(--green)]"
                aria-label="سؤالك"
              />
              <button type="submit" className="grid size-11 place-items-center rounded-full bg-[var(--green)] text-white hover:bg-[var(--green-2)]" aria-label="إرسال">
                <Send className="size-4 -scale-x-100" />
              </button>
            </form>
            <a href={staffLink(lastQuestion)} target="_blank" rel="noopener" className="mt-2 flex items-center justify-center gap-2 rounded-full py-2 text-sm text-[var(--muted)] hover:text-[var(--green)]">
              <UserRound className="size-4" /> التحدث مع موظف مباشرة على واتساب
            </a>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {!open && hint ? (
          <button type="button" onClick={() => setOpen(true)} className="rise hidden rounded-2xl bg-white px-4 py-2.5 text-start text-sm shadow-lg ring-1 ring-black/5 sm:block">
            <span className="block font-bold text-[var(--ink)]">عندك سؤال؟</span>
            <span className="text-[var(--muted)]">المساعد جاهز – أو موظف على واتساب</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setHint(false);
          }}
          className={cn("group flex h-14 items-center gap-2.5 rounded-full bg-[#25D366] ps-4 pe-5 text-white shadow-[0_14px_34px_-10px_rgba(37,211,102,0.75)] transition hover:brightness-105", open && "pe-4")}
          aria-expanded={open}
          aria-label="استفسار سريع عبر واتساب"
        >
          {open ? <X className="size-6" /> : <WhatsAppIcon className="size-6" />}
          {!open ? (
            <span className="text-start leading-tight">
              <span className="block text-[0.95rem] font-bold">استفسار سريع</span>
              <span className="block text-[0.7rem] text-white/85">QuickDesign · واتساب</span>
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
