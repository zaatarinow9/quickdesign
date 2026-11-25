const { chromium } = require("playwright");
const sharp = require("sharp");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 2 });
  await p.goto("file://" + require("path").join(__dirname, "flex-banner.html") + "");
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  const png = await p.screenshot({ type: "png" });
  // rechter Bereich: Öse, Kabelbinder, Fahne
  await sharp(png).extract({ left: 1300, top: 700, width: 1000, height: 1000 }).resize(1200, 1200).webp({ quality: 86 }).toFile(require("path").join(__dirname, "..", "..", "..", "public", "shop", "flex-banner-detail.webp"));
  await b.close();
  console.log("ok");
})();
