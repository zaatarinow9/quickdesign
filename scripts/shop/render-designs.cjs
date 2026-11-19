/**
 * Rendert design/shop/*.svg mit Thmanyah zu transparenten PNGs (scripts/shop/.build/designs).
 * Aufruf: node scripts/shop/render-designs.cjs
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const src = path.join(root, "design", "shop");
const out = path.join(__dirname, ".build", "designs");
fs.mkdirSync(out, { recursive: true });
const fonts = [400, 500, 700, 900]
  .map((w, i) => {
    const f = ["Regular", "Medium", "Bold", "Bold"][i];
    const p = path.join(root, "src/app/shop/fonts", `thmanyahsans-${f}.woff2`);
    return `@font-face{font-family:'Thmanyah Sans';font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(p).toString("base64")}) format('woff2')}`;
  })
  .join("");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const file of fs.readdirSync(src).filter((f) => f.endsWith(".svg"))) {
    const svg = fs.readFileSync(path.join(src, file), "utf8");
    const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const scale = Math.min(2, 3000 / Number(w));
    await page.setViewportSize({ width: Math.round(w * scale), height: Math.round(h * scale) });
    await page.setContent(`<style>${fonts}html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(out, file.replace(".svg", ".png")), omitBackground: true });
  }
  await browser.close();
  console.log("PNGs →", out);
})();
