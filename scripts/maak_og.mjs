// Maakt src/og.png, het beeld dat sociale media bij een link tonen.
// Vereist Playwright en een draaiende lokale server (voor de lettertypen).
import { createRequire } from "node:module";
import { poster } from "../src/js/poster.js";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASIS = process.env.BASIS ?? "http://127.0.0.1:8811";
const vlak = (id, sector, type) => poster({ id, naam: "", sector, type });
const html = `<!doctype html><link rel="stylesheet" href="${BASIS}/css/stijl.css"><style>
  body{margin:0;width:1200px;height:630px;background:#f9f9f7;color:#131313;display:grid;grid-template-rows:auto 1fr auto;overflow:hidden}
  .b{display:flex;justify-content:space-between;padding:22px 40px;border-bottom:1px solid #131313;font:400 18px "Courier Prime";text-transform:uppercase}
  h1{font:400 286px/0.8 "Instrument Serif";letter-spacing:-0.03em;text-transform:uppercase;margin:0;text-align:center;align-self:center;padding-top:26px}
  .o{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #131313;height:150px}.o svg{width:100%;height:100%}
</style><div class="b"><span>(2026)</span><span>De award voor AI die werkt</span><span>wairthy.com</span></div>
<h1>Wairthy</h1>
<div class="o">${vlak("og-a", "Zorg", "Spraak en verslaglegging")}${vlak("og-b", "Financiën", "Voorspelmodel")}${vlak("og-c", "Retail", "Assistent voor klanten")}${vlak("og-d", "Overheid", "Beeldherkenning")}</div>`;
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto(BASIS + "/404.html");
await p.setContent(html, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: new URL("../src/og.png", import.meta.url).pathname });
await browser.close();
console.log("src/og.png gemaakt");
