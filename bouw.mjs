// Bouwt de site in dist/. Gebruik: node bouw.mjs
// Er zijn twee uitgaven: de echte site, en een voorbeeldomgeving onder
// /voorbeeld/ met verzonnen oplossingen, juryleden en cijfers. Die laat
// zien hoe het platform eruitziet zodra de jury draait, zonder dat echte
// organisaties cijfers krijgen die niemand heeft gegeven.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CRITERIA, ONDERSCHEIDINGEN, MIN_JURYLEDEN, BEWIJS } from "./src/js/score.js";
import { detailHTML, kaart, esc, plaatje } from "./src/js/weergave.js";
import { poster } from "./src/js/poster.js";
import { collecties, directory } from "./src/js/indeling.js";
import { PAGINAS, SECTOREN, TYPES } from "./paginas.mjs";

const hier = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(hier, "src");
const DIST = path.join(hier, "dist");
const ADRES = (process.env.URL || "https://wairthy.com").replace(/\/$/, "");


// De delen van de site die ook in de voorbeeldomgeving bestaan.
const IN_VOORBEELD = ["", "oplossingen", "winnaars", "directory", "collecties", "jury"];

function schrijf(bestand, inhoud) {
  fs.mkdirSync(path.dirname(bestand), { recursive: true });
  fs.writeFileSync(bestand, inhoud);
}

function tel(lijst, sleutel) {
  const uit = new Map();
  for (const x of lijst) uit.set(x[sleutel], (uit.get(x[sleutel]) ?? 0) + 1);
  return [...uit.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl"));
}

function opmaak({ basis, voorbeeld, titel, beschrijving, pad, script, inhoud, actief = "", lijf = "", index = true, ontdek }) {
  const b = (deel) => (voorbeeld && !IN_VOORBEELD.includes(deel) ? "" : basis);
  const canoniek = `${ADRES}${basis}/${pad.replace(/index\.html$/, "")}`;
  const huidig = (deel) => (actief === deel ? ' aria-current="page"' : "");
  return `<!doctype html>
<html lang="nl" data-basis="${basis}"${voorbeeld ? ' data-voorbeeld="ja"' : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beschrijving)}">
${index && !voorbeeld ? `<link rel="canonical" href="${canoniek}">` : '<meta name="robots" content="noindex">'}
<meta property="og:site_name" content="Wairthy">
<meta property="og:title" content="${esc(titel)}">
<meta property="og:description" content="${esc(beschrijving)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${ADRES}/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/instrument-serif-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/instrument-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<script src="/js/vroeg.js"></script>
<link rel="stylesheet" href="/css/stijl.css">
${script ? `<script type="module" src="/js/${script}"></script>` : ""}
</head>
<body class="${lijf}">
<a class="skip" href="#inhoud">Naar de inhoud</a>
${voorbeeld ? `<p class="voorbeeldband"><b>Voorbeeldomgeving.</b> Alle oplossingen, juryleden en cijfers op deze pagina's zijn verzonnen, om te laten zien hoe het platform werkt. <a href="/">Naar de echte site</a></p>` : ""}
<header class="kop">
  <div class="kop-binnen">
    <a class="merk" href="${basis}/" aria-label="Wairthy, naar de startpagina">Wairthy<sup>(2026)</sup></a>
    <nav class="kop-nav" aria-label="Hoofdmenu">
      <button class="kop-link" type="button" data-ontdek aria-expanded="false" aria-controls="ontdek">Ontdek<span aria-hidden="true"></span></button>
      <a class="kop-link kop-breed" href="${b("directory")}/directory/"${huidig("directory")}>Directory</a>
      <a class="kop-link kop-breed" href="${b("jury")}/jury/"${huidig("jury")}>Jury</a>
      <a class="kop-link kop-breed" href="/werkwijze/"${huidig("werkwijze")}>Werkwijze</a>
    </nav>
    <div class="kop-rechts">
      <button class="kop-link" type="button" data-zoek>Zoek<kbd>/</kbd></button>
      <a class="kop-link kop-breed" href="/account/" data-account${huidig("account")}>Inloggen</a>
      <a class="knop knop-zegel knop-klein" href="/inzenden/">Inzenden</a>
    </div>
  </div>
  <div class="ontdek" id="ontdek" hidden>
    <div class="ontdek-binnen">
      <div class="ontdek-kolom">
        <h2>Awards</h2>
        <ul class="ontdek-groot">
          <li><a href="${basis}/oplossingen/">Alle oplossingen<sup>(${ontdek.aantal})</sup></a></li>
          <li><a href="${basis}/oplossingen/?stand=wairthy">Wairthy</a></li>
          <li><a href="${basis}/oplossingen/?stand=eervol">Eervolle vermelding</a></li>
          <li><a href="${basis}/oplossingen/?stand=genomineerd">Genomineerd</a></li>
          <li><a href="${basis}/winnaars/">Winnaars per maand</a></li>
        </ul>
      </div>
      <div class="ontdek-kolom">
        <h2>Per sector</h2>
        <ul>${ontdek.sectoren.map(([naam, n]) => `<li><a href="${basis}/oplossingen/?sector=${encodeURIComponent(naam)}">${esc(naam)}<sup>(${n})</sup></a></li>`).join("")}</ul>
      </div>
      <div class="ontdek-kolom">
        <h2>Per soort</h2>
        <ul>${ontdek.types.map(([naam, n]) => `<li><a href="${basis}/oplossingen/?type=${encodeURIComponent(naam)}">${esc(naam)}<sup>(${n})</sup></a></li>`).join("")}</ul>
        <h2>Collecties</h2>
        <ul>${ontdek.collecties.map((c) => `<li><a href="${basis}/collecties/${c.id}/">${esc(c.naam)}<sup>(${c.oplossingen.length})</sup></a></li>`).join("")}</ul>
      </div>
      <div class="ontdek-kolom">
        <h2>Meer</h2>
        <ul>
          <li><a href="${b("directory")}/directory/">Directory</a></li>
          <li><a href="${b("jury")}/jury/">Jury</a></li>
          <li><a href="/werkwijze/">Werkwijze</a></li>
          <li><a href="/over/">Over Wairthy</a></li>
          <li><a href="/account/">Inloggen</a></li>
        </ul>
      </div>
    </div>
  </div>
</header>
<main id="inhoud">
${inhoud.trim()}
</main>
<footer class="voet">
  <div class="breed">
    <div class="voet-kolommen">
      <p class="voet-leus">AI die werkt, beoordeeld door vakmensen.</p>
      <div>
        <h2>Ontdek</h2>
        <ul>
          <li><a href="${basis}/oplossingen/">Oplossingen</a></li>
          <li><a href="${basis}/winnaars/">Winnaars</a></li>
          <li><a href="${basis}/collecties/">Collecties</a></li>
          <li><a href="${basis}/directory/">Directory</a></li>
          <li><a href="${basis}/jury/">Jury</a></li>
        </ul>
      </div>
      <div>
        <h2>Doe mee</h2>
        <ul>
          <li><a href="/inzenden/">Een oplossing inzenden</a></li>
          <li><a href="/inzenden/?soort=aanvulling">Een vermelding aanvullen</a></li>
          <li><a href="/jury/#aanmelden">Jurylid worden</a></li>
          <li><a href="/account/">Inloggen voor juryleden</a></li>
        </ul>
      </div>
      <div>
        <h2>Wairthy</h2>
        <ul>
          <li><a href="/werkwijze/">Werkwijze en criteria</a></li>
          <li><a href="/over/">Over ons</a></li>
          <li><a href="/contact/">Contact</a></li>
          <li><a href="/voorbeeld/">Voorbeeld met cijfers</a></li>
        </ul>
      </div>
    </div>
    <p class="voet-woord" aria-hidden="true">Wairthy</p>
    <div class="voet-onder">
      <p>Gestart in 2026. Een initiatief van Sterrenstof. Namen van organisaties en producten zijn van hun eigenaren; een vermelding betekent geen samenwerking.</p>
      <ul><li><a href="/privacy/">Privacy</a></li><li><a href="/voorwaarden/">Voorwaarden</a></li></ul>
    </div>
  </div>
</footer>

<dialog class="zoek" id="zoek" aria-label="Zoeken">
  <form method="dialog" class="zoek-kop"><input type="search" id="zoek-veld" placeholder="Zoek een oplossing, organisatie of maker" autocomplete="off" aria-controls="zoek-uit" aria-label="Zoeken"><button class="zoek-sluit" type="submit" aria-label="Sluit zoeken">(esc)</button></form>
  <div class="zoek-uit" id="zoek-uit" role="listbox" aria-label="Resultaten"></div>
</dialog>
<div class="wijzer" aria-hidden="true"></div>
</body>
</html>
`;
}

function kopieer(van, naar) {
  fs.cpSync(van, naar, { recursive: true });
}

// De omslag van een collectie: een strook kleine affiches naast elkaar.
export function waaier(lijst) {
  return `<div class="strip" aria-hidden="true">${lijst.slice(0, 5).map((o) => `<span>${poster(o)}</span>`).join("")}</div>`;
}

function bouwUitgave({ basis, voorbeeld, dataMap }) {
  const uit = path.join(DIST, basis);
  const oplossingen = JSON.parse(fs.readFileSync(path.join(dataMap, "oplossingen.json"), "utf8"));
  kopieer(dataMap, path.join(uit, "data"));
  const alleCollecties = collecties(oplossingen);
  const profielen = directory(oplossingen);
  const ontdek = { aantal: oplossingen.length, sectoren: tel(oplossingen, "sector"), types: tel(oplossingen, "type"), collecties: alleCollecties };
  const gedeeld = { CRITERIA, ONDERSCHEIDINGEN, MIN_JURYLEDEN, BEWIJS, SECTOREN, TYPES, aantal: oplossingen.length, collecties: alleCollecties, profielen, waaier };
  const maak = (p) => schrijf(path.join(uit, p.pad), opmaak({ basis, voorbeeld, ontdek, ...p }));

  for (const p of PAGINAS) {
    if (voorbeeld && !p.inVoorbeeld) continue;
    maak({ ...p, inhoud: p.inhoud(gedeeld, basis) });
  }

  for (const o of oplossingen) {
    maak({
      titel: `${o.naam} van ${o.organisatie} · Wairthy`,
      beschrijving: o.kort,
      pad: `oplossingen/${o.id}/index.html`,
      script: "detail.js",
      actief: "oplossingen",
      lijf: "pagina-detail",
      inhoud: `<article class="detail" id="oplossing" data-id="${esc(o.id)}">${detailHTML(o, basis)}</article>
<nav class="breed buren" id="buren" aria-label="Vorige en volgende oplossing"></nav>
<section class="breed blok" id="verwant"></section>`,
    });
  }

  for (const c of alleCollecties) {
    maak({
      titel: `${c.naam} · Collectie · Wairthy`,
      beschrijving: c.uitleg,
      pad: `collecties/${c.id}/index.html`,
      script: "statisch.js",
      actief: "collecties",
      inhoud: `<section class="paginakop"><div class="breed"><p class="kruimel"><a href="${basis}/collecties/">Collecties</a></p><h1>${esc(c.naam)}<sup>(${c.oplossingen.length})</sup></h1><p>${esc(c.uitleg)}</p></div></section>
<section class="breed"><div class="raster">${c.oplossingen.map((o) => kaart(o, basis)).join("")}</div></section>`,
    });
  }

  for (const p of profielen) {
    maak({
      titel: `${p.naam} · Directory · Wairthy`,
      beschrijving: `${p.naam} in de selectie van Wairthy: ${p.oplossingen.length} ${p.oplossingen.length === 1 ? "oplossing" : "oplossingen"}.`,
      pad: `directory/${p.slug}/index.html`,
      script: "profiel.js",
      actief: "directory",
      inhoud: `<section class="profiel-kop" id="profiel" data-slug="${esc(p.slug)}"><div class="breed">
  <p class="kruimel"><a href="${basis}/directory/">Directory</a></p>
  <div class="profiel-naam">${plaatje(p.naam, "plaatje-groot")}<div><h1>${esc(p.naam)}</h1><p class="meta">${esc(p.rol)} · ${p.sectoren.map(esc).join(", ")}</p></div></div>
  <dl class="profiel-stand" id="profiel-stand"><div><dt>Oplossingen</dt><dd>${p.oplossingen.length}</dd></div><div><dt>Wairthy</dt><dd>0</dd></div><div><dt>Eervolle vermelding</dt><dd>0</dd></div><div><dt>Hoogste cijfer</dt><dd>–</dd></div></dl>
</div></section>
<section class="breed blok"><div class="blok-kop"><h2>Werk in de selectie</h2></div><div class="raster">${p.oplossingen.map((o) => kaart(o, basis)).join("")}</div></section>`,
    });
  }
  return oplossingen;
}

fs.rmSync(DIST, { recursive: true, force: true });
for (const map of ["css", "js", "fonts"]) kopieer(path.join(SRC, map), path.join(DIST, map));
for (const los of ["favicon.svg", "og.png"]) if (fs.existsSync(path.join(SRC, los))) fs.copyFileSync(path.join(SRC, los), path.join(DIST, los));

const echt = bouwUitgave({ basis: "", voorbeeld: false, dataMap: path.join(SRC, "data") });
const proef = bouwUitgave({ basis: "/voorbeeld", voorbeeld: true, dataMap: path.join(SRC, "voorbeeld") });

const vandaag = new Date().toISOString().slice(0, 10);
const adressen = [
  ...PAGINAS.filter((p) => p.index !== false).map((p) => p.pad.replace(/index\.html$/, "")),
  ...echt.map((o) => `oplossingen/${o.id}/`),
  ...collecties(echt).map((c) => `collecties/${c.id}/`),
  ...directory(echt).map((p) => `directory/${p.slug}/`),
];
schrijf(
  path.join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${adressen.map((a) => `  <url><loc>${ADRES}/${a}</loc><lastmod>${vandaag}</lastmod></url>`).join("\n")}\n</urlset>\n`
);
schrijf(path.join(DIST, "robots.txt"), `User-agent: *\nDisallow: /account/\nDisallow: /beheer/\nDisallow: /voorbeeld/\nDisallow: /api/\nSitemap: ${ADRES}/sitemap.xml\n`);

console.log(`gebouwd: ${echt.length} oplossingen, ${proef.length} voorbeelden, ${PAGINAS.length} vaste pagina's in dist/`);
