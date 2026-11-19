/**
 * Vorschaubild (Open Graph) als runder Sticker – 1200 × 1200, für WhatsApp, Facebook usw.
 * Aufruf: node scripts/shop/og-sticker.cjs  → public/shop/og-sticker.png
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..", "..");
const b64 = (p) => fs.readFileSync(p).toString("base64");
const font = (w, f) => `@font-face{font-family:Q;font-weight:${w};src:url(data:font/woff2;base64,${b64(path.join(root, "src/app/shop/fonts", `qomra-${f}.woff2`))}) format('woff2')}`;
const eagle = `data:image/png;base64,${b64(path.join(root, "design/shop/nisr-gold.png"))}`;

const star = (cx, cy, r) => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.4 : r;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    p.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${p.join("L")}Z`;
};

const html = `<!doctype html><html dir="rtl"><head><style>
${font(400, "Regular")}${font(700, "Bold")}${font(900, "Black")}
html,body{margin:0;width:1200px;height:1200px}
body{font-family:Q;display:grid;place-items:center;
 background:radial-gradient(circle at 50% 42%,#0d6b5c 0%,#054239 55%,#032b25 100%);overflow:hidden;position:relative}
.pat{position:absolute;inset:0;opacity:.07;background-image:radial-gradient(#b9a779 1.4px,transparent 1.6px);background-size:34px 34px}
.wrap{position:relative;width:980px;height:980px;filter:drop-shadow(0 40px 60px rgba(0,0,0,.45))}
</style></head><body><div class="pat"></div><div class="wrap">
<svg viewBox="0 0 1000 1000" width="980" height="980" xmlns="http://www.w3.org/2000/svg">
 <defs>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3d3a4"/><stop offset=".45" stop-color="#b9a779"/><stop offset="1" stop-color="#8f7c4f"/></linearGradient>
  <radialGradient id="face" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="#0e6a5b"/><stop offset="1" stop-color="#043a32"/></radialGradient>
  <path id="top" d="M 140 500 A 360 360 0 0 1 860 500"/>
  <path id="bot" d="M 118 500 A 382 382 0 0 0 882 500"/>
 </defs>
 <!-- Stanzrand -->
 <circle cx="500" cy="500" r="496" fill="#ffffff"/>
 <circle cx="500" cy="500" r="470" fill="url(#gold)"/>
 <circle cx="500" cy="500" r="452" fill="url(#face)"/>
 <circle cx="500" cy="500" r="408" fill="none" stroke="url(#gold)" stroke-width="3"/>
 <circle cx="500" cy="500" r="318" fill="none" stroke="url(#gold)" stroke-width="2" opacity=".55"/>
 <text font-family="Q" font-weight="700" font-size="46" fill="#e3d3a4" letter-spacing="2"><textPath href="#top" startOffset="50%" text-anchor="middle">عيد التحرير · الذكرى الثانية</textPath></text>
 <text font-family="Q" font-weight="700" font-size="40" fill="#e3d3a4" letter-spacing="1"><textPath href="#bot" startOffset="50%" text-anchor="middle">الثامن من كانون الأول · 2024 – 2026</textPath></text>
 <circle cx="104" cy="500" r="9" fill="#e3d3a4"/><circle cx="896" cy="500" r="9" fill="#e3d3a4"/>
 <image href="${eagle}" x="355" y="215" width="290" height="218"/>
 <text x="500" y="560" text-anchor="middle" font-family="Q" font-weight="900" font-size="128" fill="#ffffff">سوريا حرّة</text>
 <g transform="translate(330 600)">
  <rect width="340" height="24" fill="#0b7a3e"/><rect y="24" width="340" height="24" fill="#ffffff"/><rect y="48" width="340" height="24" fill="#111"/>
  <path d="${star(110, 36, 9)}" fill="#ce1126"/><path d="${star(170, 36, 9)}" fill="#ce1126"/><path d="${star(230, 36, 9)}" fill="#ce1126"/>
  <rect width="340" height="72" fill="none" stroke="url(#gold)" stroke-width="3"/>
 </g>
 <text x="500" y="780" text-anchor="middle" font-family="Q" font-weight="900" font-size="92" fill="url(#gold)" direction="ltr">8.12</text>
 <!-- Glanz -->
 <ellipse cx="380" cy="230" rx="260" ry="120" fill="#fff" opacity=".05" transform="rotate(-25 380 230)"/>
</svg></div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const out = path.join(root, "public/shop/og-sticker.png");
  await page.screenshot({ path: out });
  await browser.close();
  console.log("→", out);
})();
