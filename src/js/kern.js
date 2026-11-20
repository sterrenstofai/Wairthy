// Gedeelde bouwstenen voor de browser: gegevens laden, de API, het dok
// met het ontdekmenu, zoeken, de wijzer en de overgang tussen pagina's.
import { oordeel } from "./score.js";
import { kaart, esc, adresVan, plaatje, profielAdres } from "./weergave.js";
import { poster } from "./poster.js";
import { directory, collecties } from "./indeling.js";

const html = document.documentElement;
export const BASIS = html.dataset.basis ?? "";
export const VOORBEELD = html.dataset.voorbeeld === "ja";
const RUSTIG = matchMedia("(prefers-reduced-motion: reduce)").matches;

async function haal(pad) {
  const antwoord = await fetch(pad, { cache: "no-cache" });
  if (!antwoord.ok) throw new Error(`${pad}: ${antwoord.status}`);
  return antwoord.json();
}

// Een bezoeker die nooit inlogde hoeven we niet naar een sessie te vragen.
export function ooitIngelogd() {
  try {
    return localStorage.getItem("mp-ingelogd") === "ja";
  } catch {
    return false;
  }
}
export function onthoudLogin(aan) {
  try {
    if (aan) localStorage.setItem("mp-ingelogd", "ja");
    else localStorage.removeItem("mp-ingelogd");
  } catch {
    /* geen opslag */
  }
}

// Eén aanroep naar de API. Geeft { ok, status, data } terug en gooit nooit,
// zodat een pagina ook zonder achterkant blijft werken.
export async function api(pad, body) {
  try {
    const antwoord = await fetch(`/api${pad}`, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      // Wie is ingelogd wil zijn eigen wijziging meteen zien; bezoekers mogen de korte cache gebruiken.
      cache: ooitIngelogd() ? "no-store" : "default",
    });
    const tekst = await antwoord.text();
    let data = null;
    try {
      data = JSON.parse(tekst);
    } catch {
      /* geen JSON: de achterkant is er niet */
    }
    return { ok: antwoord.ok && data !== null, status: antwoord.status, data };
  } catch (fout) {
    return { ok: false, status: 0, data: null, fout };
  }
}

let geladen;

// Laadt de selectie, de jury en de beoordelingen, en hangt aan elke
// oplossing haar oordeel. De vaste bestanden zijn de basis; wat de
// achterkant weet (nieuwe juryleden, cijfers, gepubliceerde inzendingen,
// verborgen vermeldingen) komt eroverheen.
export function laadData() {
  geladen ??= (async () => {
    const [oplossingen, jury, beoordelingen, staat] = await Promise.all([
      haal(`${BASIS}/data/oplossingen.json`),
      haal(`${BASIS}/data/jury.json`),
      haal(`${BASIS}/data/beoordelingen.json`),
      VOORBEELD ? null : api("/staat"),
    ]);
    let belangen = [];
    if (staat?.ok) {
      const s = staat.data;
      const bekend = new Set(oplossingen.map((o) => o.id));
      for (const o of s.oplossingen ?? []) if (!bekend.has(o.id)) oplossingen.push({ ...o, los: true });
      const juryIds = new Set(jury.map((j) => j.id));
      for (const j of s.jury ?? []) if (!juryIds.has(j.id)) jury.push(j);
      beoordelingen.push(...(s.beoordelingen ?? []));
      belangen = s.belangen ?? [];
      const verborgen = new Set(s.verborgen ?? []);
      for (let i = oplossingen.length - 1; i >= 0; i--) if (verborgen.has(oplossingen[i].id)) oplossingen.splice(i, 1);
    }
    const perOplossing = new Map();
    for (const b of beoordelingen) {
      if (!perOplossing.has(b.oplossing)) perOplossing.set(b.oplossing, []);
      perOplossing.get(b.oplossing).push(b);
    }
    for (const o of oplossingen) {
      o.oordeel = oordeel(perOplossing.get(o.id));
      // De datum van de uitslag: de laatste beoordeling die meetelt.
      o.uitslag = o.oordeel.compleet ? o.oordeel.stemmen.map((s) => String(s.datum ?? "")).sort().pop() : null;
    }
    return { oplossingen, jury, beoordelingen, belangen, live: Boolean(staat?.ok) };
  })();
  return geladen;
}

export function toonFout(doel, fout) {
  console.error(fout);
  if (doel) doel.innerHTML = `<p class="melding">De gegevens konden niet worden geladen. Ververs de pagina om het opnieuw te proberen.</p>`;
}

// Weeknummer volgens ISO 8601, voor de wekelijkse uitgelichte oplossingen.
export function weeknummer(datum = new Date()) {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()));
  const dag = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dag);
  const begin = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { jaar: d.getUTCFullYear(), week: Math.ceil(((d - begin) / 86400000 + 1) / 7) };
}

// Kaarten die al in de HTML staan krijgen de actuele stand van de jury.
// Een verborgen oplossing verdwijnt.
export function verversKaarten(oplossingen, wortel = document) {
  const perId = new Map(oplossingen.map((o) => [o.id, o]));
  for (const el of wortel.querySelectorAll(".kaart[data-id]")) {
    const o = perId.get(el.dataset.id);
    if (!o) el.remove();
    else if (o.oordeel?.aantal) el.outerHTML = kaart(o, BASIS);
  }
}

// Laat blokken rustig binnenkomen als ze in beeld schuiven, en laat
// getallen optellen.
export function onthul(wortel = document) {
  const doelen = wortel.querySelectorAll("[data-onthul]:not(.zichtbaar), [data-tel]:not(.geteld)");
  const toon = (el) => {
    el.classList.add("zichtbaar");
    if (el.dataset.tel !== undefined && !el.classList.contains("geteld")) telOp(el);
  };
  if (!("IntersectionObserver" in window) || RUSTIG) {
    for (const d of doelen) toon(d);
    return;
  }
  const kijker = new IntersectionObserver(
    (items) => {
      for (const item of items) {
        if (item.isIntersecting) {
          toon(item.target);
          kijker.unobserve(item.target);
        }
      }
    },
    { rootMargin: "0px 0px -6% 0px" }
  );
  for (const d of doelen) kijker.observe(d);
}

function telOp(el) {
  el.classList.add("geteld");
  const eind = Number(el.textContent);
  if (!Number.isFinite(eind) || eind < 2 || RUSTIG) return;
  const start = performance.now();
  const duur = 900;
  const stap = (nu) => {
    const t = Math.min(1, (nu - start) / duur);
    el.textContent = Math.round(eind * (1 - (1 - t) ** 3));
    if (t < 1) requestAnimationFrame(stap);
  };
  requestAnimationFrame(stap);
}

// De wijzer: een rond label dat de muis volgt boven alles met data-wijzer.
// Met data-wijzer-beeld toont hij het affiche van die oplossing.
function wijzer() {
  const el = document.querySelector(".wijzer");
  if (!el || RUSTIG || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  let x = 0, y = 0, tx = 0, ty = 0, actief = null, loopt = false, beelden = null;
  const teken = () => {
    x += (tx - x) * 0.22;
    y += (ty - y) * 0.22;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    if (actief || Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) requestAnimationFrame(teken);
    else loopt = false;
  };
  document.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    tx = e.clientX;
    ty = e.clientY;
    const doel = e.target.closest?.("[data-wijzer]") ?? null;
    if (doel !== actief) {
      actief = doel;
      el.classList.toggle("aan", Boolean(doel));
      el.classList.toggle("met-beeld", Boolean(doel?.dataset.wijzerBeeld));
      if (doel) {
        const id = doel.dataset.wijzerBeeld;
        if (id) {
          (beelden ? Promise.resolve(beelden) : laadData().then((d) => (beelden = new Map(d.oplossingen.map((o) => [o.id, o]))))).then((m) => {
            if (actief === doel && m.get(id)) el.innerHTML = poster(m.get(id));
          });
        } else el.textContent = doel.dataset.wijzer;
      }
    }
    if (!loopt) {
      loopt = true;
      x ||= tx;
      y ||= ty;
      requestAnimationFrame(teken);
    }
  });
  document.addEventListener("pointerleave", () => el.classList.remove("aan"));
}

// Het affiche van een aangeklikte kaart groeit door naar het podium op de
// detailpagina (waar de browser dat ondersteunt).
function overgang() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest?.(".kaart-link");
    if (!link) return;
    for (const el of document.querySelectorAll('[style*="view-transition-name"]')) el.style.viewTransitionName = "";
    const beeld = link.querySelector(".kaart-beeld");
    if (beeld) beeld.style.viewTransitionName = "affiche";
  });
  addEventListener("pageshow", () => {
    for (const el of document.querySelectorAll(".kaart-beeld")) el.style.viewTransitionName = "";
  });
}

// Zoeken over de hele selectie, met het toetsenbord te bedienen.
function zoeken() {
  const dialoog = document.querySelector("#zoek");
  const veld = document.querySelector("#zoek-veld");
  const uit = document.querySelector("#zoek-uit");
  if (!dialoog?.showModal) return;
  let index = null;
  let keuze = 0;
  const PAGINAS = [
    ["Oplossingen", `${BASIS}/oplossingen/`], ["Winnaars", `${BASIS}/winnaars/`], ["Collecties", `${BASIS}/collecties/`], ["Directory", `${BASIS}/directory/`],
    ["Jury", `${BASIS}/jury/`], ["Werkwijze en criteria", "/werkwijze/"], ["Inzenden", "/inzenden/"], ["Over Wairthy", "/over/"], ["Contact", "/contact/"],
  ];
  const bouwIndex = async () => {
    const { oplossingen } = await laadData();
    index = {
      oplossingen: oplossingen.map((o) => ({ o, tekst: `${o.naam} ${o.organisatie} ${o.sector} ${o.type} ${(o.gebouwdMet ?? []).join(" ")} ${o.kort}`.toLowerCase() })),
      profielen: directory(oplossingen),
      collecties: collecties(oplossingen),
    };
  };
  const toon = () => {
    if (!index) return;
    const q = veld.value.trim().toLowerCase();
    const delen = q.split(/\s+/).filter(Boolean);
    const past = (tekst) => delen.every((d) => tekst.includes(d));
    const opl = (q ? index.oplossingen.filter((x) => past(x.tekst)) : index.oplossingen.slice(0, 5)).slice(0, 6);
    const prof = q ? index.profielen.filter((p) => past(p.naam.toLowerCase())).slice(0, 4) : [];
    const col = q ? index.collecties.filter((c) => past(`${c.naam} ${c.uitleg}`.toLowerCase())).slice(0, 3) : [];
    const pag = q ? PAGINAS.filter(([naam]) => past(naam.toLowerCase())).slice(0, 3) : PAGINAS.slice(0, 4);
    const groep = (titel, rijen) => (rijen.length ? `<p class="zoek-groep">${titel}</p>${rijen.join("")}` : "");
    uit.innerHTML =
      groep(q ? "Oplossingen" : "Uit de selectie", opl.map(({ o }) => `<a class="zoek-rij" role="option" href="${esc(adresVan(o, BASIS))}"><span class="zoek-beeld">${poster(o)}</span><span><b>${esc(o.naam)}</b><small>${esc(o.organisatie)} · ${esc(o.sector)}</small></span></a>`)) +
      groep("Organisaties en makers", prof.map((p) => `<a class="zoek-rij" role="option" href="${profielAdres(p.naam, BASIS)}">${plaatje(p.naam)}<span><b>${esc(p.naam)}</b><small>${esc(p.rol)} · ${p.oplossingen.length} in de selectie</small></span></a>`)) +
      groep("Collecties", col.map((c) => `<a class="zoek-rij" role="option" href="${BASIS}/collecties/${c.id}/"><span class="zoek-teken">◆</span><span><b>${esc(c.naam)}</b><small>${c.oplossingen.length} oplossingen</small></span></a>`)) +
      groep("Pagina's", pag.map(([naam, adres]) => `<a class="zoek-rij" role="option" href="${adres}"><span class="zoek-teken">→</span><span><b>${esc(naam)}</b></span></a>`));
    if (!uit.innerHTML) uit.innerHTML = `<p class="zoek-leeg">Niets gevonden voor “${esc(veld.value.trim())}”.</p>`;
    keuze = 0;
    markeer();
  };
  const rijen = () => [...uit.querySelectorAll(".zoek-rij")];
  const markeer = () => rijen().forEach((r, i) => r.setAttribute("aria-selected", String(i === keuze)));
  const open = async () => {
    if (dialoog.open) return;
    dialoog.showModal();
    veld.value = "";
    if (!index) {
      uit.innerHTML = `<p class="zoek-leeg">De selectie wordt geladen.</p>`;
      await bouwIndex().catch(console.error);
    }
    toon();
  };
  veld.addEventListener("input", toon);
  veld.addEventListener("keydown", (e) => {
    const lijst = rijen();
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      keuze = (keuze + (e.key === "ArrowDown" ? 1 : -1) + lijst.length) % Math.max(1, lijst.length);
      markeer();
      lijst[keuze]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      lijst[keuze]?.click();
    }
  });
  dialoog.addEventListener("click", (e) => e.target === dialoog && dialoog.close());
  for (const knop of document.querySelectorAll("[data-zoek]")) knop.addEventListener("click", open);
  document.addEventListener("keydown", (e) => {
    const typt = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "") || document.activeElement?.isContentEditable;
    if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typt)) {
      e.preventDefault();
      open();
    }
  });
}

// Het dok onderaan, het ontdekmenu, het thema en de inlogstatus.
export function menu() {
  const paneel = document.querySelector("#ontdek");
  const knop = document.querySelector("[data-ontdek]");
  const zet = (open) => {
    paneel.hidden = !open;
    knop.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("ontdek-open", open);
  };
  knop?.addEventListener("click", () => zet(paneel.hidden));
  document.addEventListener("keydown", (e) => e.key === "Escape" && !paneel.hidden && (zet(false), knop.focus()));
  document.addEventListener("click", (e) => {
    if (!paneel.hidden && !e.target.closest("#ontdek, [data-ontdek]")) zet(false);
  });

  // Het dok duikt weg bij omlaag scrollen en komt terug bij omhoog.
  const dok = document.querySelector(".dok");
  let vorige = scrollY;
  addEventListener(
    "scroll",
    () => {
      const omlaag = scrollY > vorige + 6 && scrollY > 400;
      const omhoog = scrollY < vorige - 6;
      if (document.body.classList.contains("ontdek-open")) dok.classList.remove("weg");
      else if (omlaag) dok.classList.add("weg");
      else if (omhoog) dok.classList.remove("weg");
      vorige = scrollY;
    },
    { passive: true }
  );

  document.querySelector("[data-thema-knop]")?.addEventListener("click", () => {
    const nieuw = html.dataset.thema === "donker" ? "licht" : "donker";
    html.dataset.thema = nieuw;
    try {
      localStorage.setItem("wy-thema", nieuw);
    } catch {
      /* geen opslag */
    }
  });

  zoeken();
  wijzer();
  overgang();
  onthul();

  if (VOORBEELD || !ooitIngelogd()) return;
  api("/ik").then((r) => {
    if (r.status === 401) onthoudLogin(false);
    const link = document.querySelector("[data-account]");
    if (r.ok && link) link.textContent = r.data.rol === "beheer" ? "Beheer" : "Mijn jurywerk";
    if (r.ok && link && r.data.rol === "beheer") link.href = "/beheer/";
  });
}

// Verstuurt een formulier als JSON naar de API en meldt eerlijk of het lukte.
export function formulier(form, pad, { naGelukt, verzamel } = {}) {
  if (!form) return;
  const status = form.querySelector(".formstatus");
  const knop = form.querySelector('button[type="submit"]');
  form.addEventListener("submit", async (gebeurtenis) => {
    gebeurtenis.preventDefault();
    if (!form.reportValidity()) return;
    knop.disabled = true;
    status.className = "formstatus";
    status.textContent = "Bezig met versturen.";
    const gegevens = verzamel ? verzamel() : leesFormulier(form);
    const r = await api(pad, gegevens);
    knop.disabled = false;
    if (r.ok) {
      status.className = "formstatus gelukt";
      status.textContent = form.dataset.gelukt ?? "Verstuurd. Dank je wel.";
      form.reset();
      naGelukt?.(r.data);
    } else {
      status.className = "formstatus mislukt";
      status.textContent = r.data?.fout ?? "Het versturen is niet gelukt. Er is niets opgeslagen; probeer het later opnieuw.";
    }
  });
}

export function leesFormulier(form) {
  const uit = {};
  for (const veld of form.elements) {
    if (!veld.name) continue;
    if (veld.type === "checkbox") uit[veld.name] = veld.checked;
    else if (veld.type === "radio") {
      if (veld.checked) uit[veld.name] = veld.value;
    } else uit[veld.name] = veld.value;
  }
  return uit;
}
