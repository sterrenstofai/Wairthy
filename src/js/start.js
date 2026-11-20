import { laadData, toonFout, weeknummer, menu, onthul, BASIS } from "./kern.js";
import { kaart, esc, adresVan, vlakStijl, etiket, datumTekst, lengteKlas, profielRij, plaatje } from "./weergave.js";
import { poster } from "./poster.js";
import { CRITERIA, bewijs, stand, toonCijfer } from "./score.js";
import { directoryMetStand } from "./indeling.js";

menu();

const DUUR = 7000; // milliseconden per dia
const RUSTIG = matchMedia("(prefers-reduced-motion: reduce)").matches;

function tegels(o) {
  const d = o.oordeel;
  if (d?.compleet) {
    return `<li class="tegel-groot"><b>${toonCijfer(d.eindcijfer)}</b><span>Eindcijfer</span></li>${CRITERIA.map(
      (c) => `<li><b>${toonCijfer(d.perCriterium[c.id])}</b><span>${esc(c.naam)}</span></li>`
    ).join("")}`;
  }
  return [
    [o.status, "Status"],
    [o.sinds ?? "–", "In gebruik sinds"],
    [bewijs(o).naam, "Bewijs"],
    [String(o.bronnen?.length ?? 0), "Bronnen gelezen"],
  ]
    .map(([waarde, naam]) => `<li><b>${esc(waarde)}</b><span>${esc(naam)}</span></li>`)
    .join("");
}

function dia(o, label, i) {
  return `<article class="held-dia${i === 0 ? " actief" : ""}" style="${vlakStijl(o)}" aria-roledescription="dia" aria-label="${esc(o.naam)}"${i === 0 ? "" : " inert"}>
    <div class="held-poster" aria-hidden="true">${poster(o)}</div>
    <div class="breed held-binnen">
      <p class="held-label">${esc(label)}</p>
      <h2 class="${lengteKlas(o.naam)}"><a href="${esc(adresVan(o, BASIS))}">${esc(o.naam)}</a></h2>
      <p class="held-org">${plaatje(o.organisatie)}<span>${esc(o.organisatie)}</span>${etiket(o)}</p>
      <p class="held-kort">${esc(o.kort)}</p>
      <ul class="held-tegels${o.oordeel?.compleet ? " held-tegels-cijfers" : ""}">${tegels(o)}</ul>
      <a class="knop knop-op-vlak" href="${esc(adresVan(o, BASIS))}">Bekijk de oplossing <span aria-hidden="true">→</span></a>
    </div>
  </article>`;
}

// De carrousel bovenaan: vijf oplossingen, elk zeven seconden in beeld.
function carrousel(held, dias) {
  const els = [...held.querySelectorAll(".held-dia")];
  const knoppen = [...held.querySelectorAll(".held-streepjes button")];
  const teller = held.querySelector(".held-teller b");
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
    teller.textContent = String(nu + 1).padStart(2, "0");
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
  document.querySelector("#tel-win").textContent = winnaars.length || "";

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
  held.innerHTML = `${gekozen.map((o, i) => dia(o, o.oordeel?.compleet ? `${o.oordeel.onderscheiding?.naam ?? "Beoordeeld"} · ${datumTekst(o.uitslag)}` : `In de schijnwerper · week ${week}`, i)).join("")}
    <div class="held-bediening"><div class="breed">
      <span class="held-teller"><b>01</b> / ${String(gekozen.length).padStart(2, "0")}</span>
      <div class="held-streepjes">${gekozen.map((o, i) => `<button type="button" aria-label="Toon ${esc(o.naam)}" style="--duur:${DUUR}ms"><i></i></button>`).join("")}</div>
      <button class="held-knop" type="button" data-vorige aria-label="Vorige">←</button>
      <button class="held-knop" type="button" data-volgende aria-label="Volgende">→</button>
      <button class="held-knop held-pauze" type="button" data-pauze>Pauze</button>
    </div></div>`;
  carrousel(held, gekozen);

  // De selectie als lijst van grote namen: de naam waar je op staat wordt
  // zwart en krijgt haar affiche erbij. Tien genomineerden, zo veel mogelijk
  // uit verschillende sectoren. Dezelfde tien staan ook als raster klaar.
  // Alleen korte namen: een naam moet op één regel passen.
  const rij = open.filter((o) => !gekozen.includes(o) && o.naam.length <= 18).sort((a, b) => (b.toegevoegd ?? "").localeCompare(a.toegevoegd ?? "") || a.id.localeCompare(b.id));
  const sectorGezien = new Set();
  const keuze = [];
  for (const o of rij) if (keuze.length < 10 && !sectorGezien.has(o.sector)) (keuze.push(o), sectorGezien.add(o.sector));
  for (const o of rij) if (keuze.length < 10 && !keuze.includes(o)) keuze.push(o);
  const index = document.querySelector("#index");
  const lijst = document.querySelector("#index-lijst");
  const beeld = document.querySelector("#index-beeld");
  const raster = document.querySelector("#genomineerd");
  lijst.innerHTML = keuze
    .map((o, i) => `<li><a href="${esc(adresVan(o, BASIS))}" data-i="${i}"><span class="index-nr">${String(i + 1).padStart(2, "0")}</span><span class="index-naam">${esc(o.naam)}</span><span class="index-org">${esc(o.organisatie)}<br>${esc(o.sector)}</span></a></li>`)
    .join("");
  raster.innerHTML = keuze.slice(0, 8).map((o) => kaart(o, BASIS)).join("");
  const kies = (a) => {
    for (const li of lijst.children) li.classList.toggle("actief", li.firstElementChild === a);
    if (!a) return index.classList.remove("heeft-beeld");
    beeld.innerHTML = poster(keuze[Number(a.dataset.i)]);
    beeld.style.setProperty("--y", `${a.parentElement.offsetTop + a.parentElement.offsetHeight / 2}px`);
    index.classList.add("heeft-beeld");
  };
  lijst.addEventListener("pointerover", (e) => e.pointerType === "mouse" && e.target.closest("a") && kies(e.target.closest("a")));
  lijst.addEventListener("focusin", (e) => kies(e.target.closest("a")));
  if (matchMedia("(hover: hover)").matches && lijst.firstElementChild) kies(lijst.firstElementChild.firstElementChild);
  const zetWeergave = (welke) => {
    index.hidden = welke !== "lijst";
    raster.hidden = welke === "lijst";
    for (const k of document.querySelectorAll("[data-index]")) k.setAttribute("aria-pressed", String(k.dataset.index === welke));
  };
  for (const k of document.querySelectorAll("[data-index]")) k.addEventListener("click", () => zetWeergave(k.dataset.index));

  document.querySelector("#winnaars").innerHTML = winnaars.length
    ? `<div class="raster">${winnaars.slice(0, 4).map((o) => kaart(o, BASIS)).join("")}</div>`
    : `<div class="leegstaat" data-onthul>
        <div><p class="meta">Eerste juryronde</p><h3>De eerste uitslag komt eraan.</h3></div>
        <div><p>De jury wordt nu samengesteld. Zodra minstens drie juryleden een oplossing hebben beoordeeld, staat hier de uitslag, met de cijfers per jurylid. Tot die tijd is elke oplossing genomineerd, zonder cijfer.</p>
        <p class="leegstaat-links"><a class="pijl" href="/werkwijze/">Hoe de jury beoordeelt</a><a class="pijl" href="/voorbeeld/">Bekijk een voorbeeld met cijfers</a></p></div>
      </div>`;

  document.querySelector("#directory-kort").innerHTML = `<ol class="dir">${directoryMetStand(oplossingen).slice(0, 6).map((p, i) => profielRij(p, i + 1, BASIS)).join("")}</ol>`;
  onthul();
} catch (fout) {
  toonFout(document.querySelector("#held"), fout);
}
