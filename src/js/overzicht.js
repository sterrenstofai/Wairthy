import { laadData, toonFout, menu, BASIS } from "./kern.js";
import { kaart, esc, adresVan, etiket, plaatje } from "./weergave.js";
import { BEWIJS, bewijs, stand, toonCijfer } from "./score.js";
import { collecties } from "./indeling.js";

menu();

const raster = document.querySelector("#raster");
const formulier = document.querySelector("#filters");
const chips = document.querySelector("#chips");
const paneel = document.querySelector("#filterpaneel");
const meer = document.querySelector("#meer");
const groepen = ["stand", "sector", "type", "status", "bewijs", "collectie"];
const velden = [...groepen, "zoek", "maker", "volgorde"];
let weergave = "raster";
const PER_KEER = 24;
let getoond = PER_KEER;
try {
  weergave = localStorage.getItem("mp-weergave") === "lijst" ? "lijst" : "raster";
} catch {
  /* geen opslag: raster */
}

// Op een smal scherm klappen de filters in.
const smal = matchMedia("(max-width: 980px)");
const zetPaneel = () => (paneel.open = !smal.matches);
smal.addEventListener("change", zetPaneel);
zetPaneel();

const waarde = (naam) => formulier.elements[naam]?.value ?? "";

function leesAdres() {
  const p = new URLSearchParams(location.search);
  for (const v of velden) {
    const w = p.get(v);
    if (w === null) continue;
    const veld = formulier.elements[v];
    if (veld instanceof RadioNodeList) {
      if ([...veld].some((r) => r.value === w)) veld.value = w;
    } else if (veld && (veld.tagName !== "SELECT" || [...veld.options].some((o) => o.value === w))) veld.value = w;
  }
}

function rij(o) {
  const d = o.oordeel;
  return `<tr data-wijzer="Bekijk" data-wijzer-beeld="${esc(o.id)}"><td><a href="${esc(adresVan(o, BASIS))}">${esc(o.naam)}</a></td><td><span class="met-plaatje">${plaatje(o.organisatie, "plaatje-klein")}${esc(o.organisatie)}</span></td><td>${esc(o.sector)}</td><td>${esc(o.type)}</td><td>${etiket(o)}</td><td class="getal">${d?.compleet ? toonCijfer(d.eindcijfer) : "–"}</td></tr>`;
}

try {
  const { oplossingen } = await laadData();
  const alleCollecties = collecties(oplossingen);
  const tel = (lijst, pak) => {
    const uit = new Map();
    for (const o of lijst) uit.set(pak(o), (uit.get(pak(o)) ?? 0) + 1);
    return uit;
  };
  // Elke filtergroep: de keuzes met hun naam, en hoe een oplossing erbij hoort.
  const opties = {
    stand: { namen: new Map([["wairthy", "Wairthy"], ["eervol", "Eervolle vermelding"], ["beoordeeld", "Beoordeeld"], ["genomineerd", "Genomineerd"]]), pak: stand },
    sector: { pak: (o) => o.sector },
    type: { pak: (o) => o.type },
    status: { pak: (o) => o.status },
    bewijs: { namen: new Map(BEWIJS.slice().reverse().map((b) => [String(b.niveau), b.naam])), pak: (o) => String(bewijs(o).niveau) },
    collectie: { namen: new Map(alleCollecties.map((c) => [c.id, c.naam])), hoort: (o, w) => alleCollecties.find((c) => c.id === w)?.hoort(o) ?? false },
  };
  for (const g of groepen) {
    const opt = opties[g];
    const aantallen = opt.pak ? tel(oplossingen, opt.pak) : new Map(alleCollecties.map((c) => [c.id, c.oplossingen.length]));
    opt.namen ??= new Map([...aantallen.keys()].sort((a, b) => a.localeCompare(b, "nl")).map((k) => [k, k]));
    formulier.querySelector(`[data-groep="${g}"]`).insertAdjacentHTML(
      "beforeend",
      `<label><input type="radio" name="${g}" value="" checked><span>Alles</span></label>` +
        [...opt.namen.entries()].map(([w, naam]) => `<label><input type="radio" name="${g}" value="${esc(w)}"><span>${esc(naam)}</span><sup>${aantallen.get(w) ?? 0}</sup></label>`).join("")
    );
  }
  leesAdres();

  const past = (o, g) => {
    const w = waarde(g);
    if (!w) return true;
    return opties[g].hoort ? opties[g].hoort(o, w) : opties[g].pak(o) === w;
  };

  const toon = () => {
    const zoek = waarde("zoek").trim().toLowerCase();
    const maker = waarde("maker");
    const lijst = oplossingen.filter(
      (o) => groepen.every((g) => past(o, g)) && (!maker || (o.gebouwdMet ?? []).includes(maker)) && (!zoek || [o.naam, o.organisatie, o.kort, o.beschrijving, ...(o.gebouwdMet ?? [])].join(" ").toLowerCase().includes(zoek))
    );
    const opNaam = (a, b) => a.naam.localeCompare(b.naam, "nl");
    const volgorde = waarde("volgorde");
    if (volgorde === "naam") lijst.sort(opNaam);
    else if (volgorde === "organisatie") lijst.sort((a, b) => a.organisatie.localeCompare(b.organisatie, "nl") || opNaam(a, b));
    else if (volgorde === "cijfer") lijst.sort((a, b) => (b.oordeel?.eindcijfer ?? -1) - (a.oordeel?.eindcijfer ?? -1) || opNaam(a, b));
    else lijst.sort((a, b) => (b.uitslag ?? b.toegevoegd ?? "").localeCompare(a.uitslag ?? a.toegevoegd ?? "") || opNaam(a, b));

    document.querySelector("#teller-kop").textContent = lijst.length;
    raster.className = weergave === "lijst" ? "lijstweergave" : "raster raster-3";
    if (!lijst.length) raster.innerHTML = `<p class="melding">Geen oplossingen gevonden met deze filters.</p>`;
    else if (weergave === "lijst") raster.innerHTML = `<div class="tabelrol"><table class="tabel"><thead><tr><th>Oplossing</th><th>Organisatie</th><th>Sector</th><th>Soort</th><th>Oordeel</th><th class="getal">Cijfer</th></tr></thead><tbody>${lijst.map(rij).join("")}</tbody></table></div>`;
    else raster.innerHTML = lijst.slice(0, getoond).map((o) => kaart(o, BASIS)).join("");
    const rest = weergave === "lijst" ? 0 : Math.max(0, lijst.length - getoond);
    meer.hidden = rest === 0;
    meer.querySelector("button").textContent = `Toon nog ${Math.min(PER_KEER, rest)} van ${rest}`;

    // De actieve filters als losse knoppen, elk apart weg te halen.
    const actief = [
      ...groepen.filter((g) => waarde(g)).map((g) => [g, opties[g].namen.get(waarde(g)) ?? waarde(g)]),
      ...(zoek ? [["zoek", `“${waarde("zoek").trim()}”`]] : []),
      ...(maker ? [["maker", `Gebouwd met ${maker}`]] : []),
    ];
    chips.innerHTML = actief.length
      ? actief.map(([veld, naam]) => `<button type="button" class="chip" data-wis="${veld}">${esc(naam)}<span aria-hidden="true">×</span><span class="sr"> verwijderen</span></button>`).join("") + `<button type="button" class="tekstknop" data-wis="alles">Wis alles</button>`
      : `<span class="meta">Geen filters actief</span>`;
    document.querySelector("#filter-aantal").textContent = actief.length || "";

    const p = new URLSearchParams();
    for (const v of velden) {
      const w = waarde(v);
      if (w && !(v === "volgorde" && w === "nieuw")) p.set(v, w);
    }
    const tekst = p.toString();
    history.replaceState(null, "", tekst ? `?${tekst}` : location.pathname);
  };

  chips.addEventListener("click", (e) => {
    const knop = e.target.closest("[data-wis]");
    if (!knop) return;
    const welke = knop.dataset.wis === "alles" ? [...groepen, "zoek", "maker"] : [knop.dataset.wis];
    for (const v of welke) formulier.elements[v].value = "";
    toon();
  });
  for (const knop of document.querySelectorAll("[data-weergave]")) {
    knop.setAttribute("aria-pressed", String(knop.dataset.weergave === weergave));
    knop.addEventListener("click", () => {
      weergave = knop.dataset.weergave;
      try {
        localStorage.setItem("mp-weergave", weergave);
      } catch {
        /* geen opslag */
      }
      for (const k of document.querySelectorAll("[data-weergave]")) k.setAttribute("aria-pressed", String(k === knop));
      toon();
    });
  }
  meer.querySelector("button").addEventListener("click", () => ((getoond += PER_KEER), toon()));
  formulier.addEventListener("input", () => ((getoond = PER_KEER), toon()));
  // De volgorde staat buiten het formulier in de balk, maar hoort er wel bij.
  formulier.elements.volgorde.addEventListener("input", toon);
  formulier.addEventListener("submit", (e) => e.preventDefault());
  toon();
} catch (fout) {
  toonFout(raster, fout);
}
