import { laadData, toonFout, weeknummer, menu, onthul, BASIS } from "./kern.js";
import { kaart, esc, adresVan, etiket, datumTekst, lengteKlas, profielRij, naamMetJaar } from "./weergave.js";
import { poster } from "./poster.js";
import { CRITERIA, bewijs, stand, toonCijfer } from "./score.js";
import { directoryMetStand } from "./indeling.js";

menu();

const DUUR = 7000; // milliseconden per dia
const RUSTIG = matchMedia("(prefers-reduced-motion: reduce)").matches;

const PIJL = '<svg viewBox="0 0 60 44" aria-hidden="true"><path d="M3 8c18-6 40-4 46 14 2 7-1 14-5 19m-9-6 9 7 5-11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function feiten(o) {
  const d = o.oordeel;
  if (d?.compleet) return [["Eindcijfer", toonCijfer(d.eindcijfer)], ...CRITERIA.map((c) => [c.naam, toonCijfer(d.perCriterium[c.id])])];
  return [["Status", o.status], ["Bewijs", bewijs(o).naam], ["Bronnen", String(o.bronnen?.length ?? 0)]];
}

function dia(o, label, i, totaal) {
  return `<article class="held-dia${i === 0 ? " actief" : ""}" aria-roledescription="dia" aria-label="${esc(o.naam)}"${i === 0 ? "" : " inert"}>
    <p class="held-label">(${esc(label)})</p>
    <h2 class="${lengteKlas(o.naam)}"><a href="${esc(adresVan(o, BASIS))}">${naamMetJaar(o)}</a></h2>
    <a class="held-beeld" href="${esc(adresVan(o, BASIS))}" tabindex="-1" aria-hidden="true">${poster(o)}</a>
    <div class="held-voet">
      <p class="held-nr">(${String(i + 1).padStart(2, "0")}/${String(totaal).padStart(2, "0")})</p>
      <div class="held-over"><p class="held-org">${esc(o.organisatie)} ${etiket(o)}</p><p class="held-kort">${esc(o.kort)}</p></div>
      <dl class="held-feiten">${feiten(o).map(([n, w]) => `<div><dt>${esc(n)}</dt><dd>${esc(w)}</dd></div>`).join("")}</dl>
      <p class="held-ga"><span class="hand">meer weten${PIJL}</span><a class="pijl" href="${esc(adresVan(o, BASIS))}">Bekijk de oplossing</a></p>
    </div>
  </article>`;
}

// De carrousel bovenaan: vijf oplossingen, elk zeven seconden in beeld.
function carrousel(held, dias) {
  const els = [...held.querySelectorAll(".held-dia")];
  const knoppen = [...held.querySelectorAll(".held-streepjes button")];
  const pauze = held.querySelector("[data-pauze]");
  let nu = 0;
  let klok = null;
  let stil = RUSTIG;
  const toon = (i) => {
    nu = (i + els.length) % els.length;
    els.forEach((el, n) => {
      el.classList.toggle("actief", n === nu);
      el.toggleAttribute("inert", n !== nu);
    });
    knoppen.forEach((k, n) => {
      k.classList.toggle("actief", n === nu);
      k.classList.toggle("geweest", n < nu);
      k.setAttribute("aria-current", String(n === nu));
    });
    plan();
  };
  const plan = () => {
    clearTimeout(klok);
    held.classList.toggle("stil", stil);
    if (!stil && els.length > 1) klok = setTimeout(() => toon(nu + 1), DUUR);
  };
  knoppen.forEach((k, n) => k.addEventListener("click", () => toon(n)));
  held.querySelector("[data-vorige]").addEventListener("click", () => toon(nu - 1));
  held.querySelector("[data-volgende]").addEventListener("click", () => toon(nu + 1));
  pauze.addEventListener("click", () => {
    stil = !stil;
    pauze.textContent = stil ? "Speel af" : "Pauze";
    plan();
  });
  if (stil) pauze.textContent = "Speel af";
  document.addEventListener("visibilitychange", () => (document.hidden ? clearTimeout(klok) : plan()));
  held.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") toon(nu + 1);
    if (e.key === "ArrowLeft") toon(nu - 1);
  });
  toon(0);
  void dias;
}

try {
  const { oplossingen, jury } = await laadData();
  const sectoren = new Set(oplossingen.map((o) => o.sector));
  const winnaars = oplossingen.filter((o) => ["wairthy", "eervol"].includes(stand(o))).sort((a, b) => (b.uitslag ?? "").localeCompare(a.uitslag ?? "") || b.oordeel.eindcijfer - a.oordeel.eindcijfer);
  const open = oplossingen.filter((o) => !o.oordeel?.compleet);

  document.querySelector("#tel-oplossingen").textContent = oplossingen.length;
  document.querySelector("#tel-sectoren").textContent = sectoren.size;
  document.querySelector("#tel-winnaars").textContent = winnaars.length;
  document.querySelector("#tel-jury").textContent = jury.length;
  document.querySelector("#tel-open").textContent = open.length;
  document.querySelector("#tel-win").textContent = winnaars.length;

  // In de schijnwerper: eerst de nieuwste winnaars, aangevuld met
  // oplossingen die per week wisselen. Dat laatste is een keuze van de
  // redactie en geen onderscheiding; het label zegt welke van de twee het is.
  const { jaar, week } = weeknummer();
  const kandidaten = oplossingen.filter((o) => o.status === "In productie" && o.resultaat && !winnaars.includes(o)).sort((a, b) => a.id.localeCompare(b.id));
  const poel = kandidaten.length ? kandidaten : open;
  const gekozen = winnaars.slice(0, 3);
  const gezien = new Set(gekozen.map((o) => o.sector));
  for (let i = 0; gekozen.length < 5 && i < poel.length; i++) {
    const o = poel[(jaar * 53 + week + i * 7) % poel.length];
    if (!gekozen.includes(o) && !gezien.has(o.sector)) (gekozen.push(o), gezien.add(o.sector));
  }
  const held = document.querySelector("#held");
  held.innerHTML = `${gekozen.map((o, i) => dia(o, o.oordeel?.compleet ? `${o.oordeel.onderscheiding?.naam ?? "Beoordeeld"} · ${datumTekst(o.uitslag)}` : `In de schijnwerper · week ${week}`, i, gekozen.length)).join("")}
    <div class="held-bediening">
      <div class="held-streepjes">${gekozen.map((o) => `<button type="button" aria-label="Toon ${esc(o.naam)}" style="--duur:${DUUR}ms"><i></i></button>`).join("")}</div>
      <button class="held-knop" type="button" data-vorige aria-label="Vorige">←</button>
      <button class="held-knop" type="button" data-volgende aria-label="Volgende">→</button>
      <button class="held-knop held-pauze" type="button" data-pauze>Pauze</button>
    </div>`;
  carrousel(held, gekozen);

  // Acht genomineerden, zo veel mogelijk uit verschillende sectoren.
  const rij = open.filter((o) => !gekozen.includes(o)).sort((a, b) => (b.toegevoegd ?? "").localeCompare(a.toegevoegd ?? "") || a.id.localeCompare(b.id));
  const sectorGezien = new Set();
  const keuze = [];
  for (const o of rij) if (keuze.length < 8 && !sectorGezien.has(o.sector)) (keuze.push(o), sectorGezien.add(o.sector));
  for (const o of rij) if (keuze.length < 8 && !keuze.includes(o)) keuze.push(o);
  document.querySelector("#genomineerd").innerHTML = keuze.map((o) => kaart(o, BASIS)).join("");

  document.querySelector("#winnaars").innerHTML = winnaars.length
    ? `<div class="raster">${winnaars.slice(0, 4).map((o) => kaart(o, BASIS)).join("")}</div>`
    : `<div class="leegstaat" data-onthul>
        <div><p class="meta">(Eerste juryronde)</p><h3>De eerste uitslag komt eraan.</h3><p class="hand">nog even geduld</p></div>
        <div><p>De jury wordt nu samengesteld. Zodra minstens drie juryleden een oplossing hebben beoordeeld, staat hier de uitslag, met de cijfers per jurylid. Tot die tijd is elke oplossing genomineerd, zonder cijfer.</p>
        <p class="leegstaat-links"><a class="pijl" href="/werkwijze/">Hoe de jury beoordeelt</a><a class="pijl" href="/voorbeeld/">Bekijk een voorbeeld met cijfers</a></p></div>
      </div>`;

  document.querySelector("#directory-kort").innerHTML = `<ol class="dir">${directoryMetStand(oplossingen).slice(0, 6).map((p, i) => profielRij(p, i + 1, BASIS)).join("")}</ol>`;
  onthul();
} catch (fout) {
  toonFout(document.querySelector("#held"), fout);
}
