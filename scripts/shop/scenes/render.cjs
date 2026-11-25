/** Rendert scripts/shop/scenes/*.html zu public/shop/<name>.webp (1200×1200) */
const { chromium } = require("playwright");
const sharp = require("sharp");
const path = require("path");
(async () => {
  const names = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
  for (const n of names) {
    const [file, out] = n.split(":");
    await page.goto("file://" + path.join(__dirname, file + ".html"));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const png = await page.screenshot({ type: "png" });
    await sharp(png).webp({ quality: 86 }).toFile(path.join(__dirname, "..", "..", "..", "public", "shop", (out || file) + ".webp"));
    console.log("ok", out || file);
  }
  await browser.close();
})();
