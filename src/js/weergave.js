// Tekst-naar-HTML voor kaarten en detailpagina's. Geen DOM en geen fetch,
// zodat het bouwscript en de browser precies dezelfde opmaak maken.
import { poster, kleuren } from "./poster.js";
import { CRITERIA, MIN_JURYLEDEN, bewijs, toonCijfer } from "./score.js";
import { slug } from "./indeling.js";

export function esc(tekst) {
  return String(tekst ?? "").replace(/[&<>"']/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t]);
}

export function adresVan(o, basis = "") {
  return o.los ? `${basis}/oplossingen/bekijk/?id=${encodeURIComponent(o.id)}` : `${basis}/oplossingen/${o.id}/`;
}

export function datumTekst(iso, kort = false) {
  if (!iso) return "";
  if (/^\d{4}$/.test(iso)) return iso;
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: kort ? "short" : "long", year: "numeric" });
}

// Donkere of lichte tekst op een gekleurd vlak, naar gelang de helderheid.
export function inktOp(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.32 ? "#0c0c0b" : "#ffffff";
}

export function vlakStijl(o) {
  const k = kleuren(o.sector);
  return `--vlak:${k.bg};--op-vlak:${inktOp(k.bg)};--vlak-accent:${k.accent};--vlak-vorm:${k.vorm}`;
}

// Lange namen krijgen een kleinere letter, zodat ze niet midden in een woord breken.
export function lengteKlas(naam) {
  const langste = Math.max(...String(naam).split(/[\s-]+/).map((w) => w.length));
  return String(naam).length > 22 || langste > 13 ? "naam-erg-lang" : String(naam).length > 11 ? "naam-lang" : "";
}

export function initialen(naam) {
  const delen = String(naam).trim().split(/\s+/).filter((d) => /^[\p{L}\p{N}]/u.test(d));
  return ((delen[0]?.[0] ?? "") + (delen.length > 1 ? delen[delen.length - 1][0] : (delen[0]?.[1] ?? ""))).toUpperCase();
}

// Een rond naamplaatje met initialen, in een kleur die vast bij de naam hoort.
const TINTEN = ["#f6c445", "#8fe0b4", "#f7b3ab", "#a9c4f5", "#c7b8f5", "#c6f06a", "#8fd6e8", "#e3b5d6", "#ffb38a"];
export function plaatje(naam, klas = "") {
  let h = 0;
  for (const t of String(naam)) h = (h * 31 + t.charCodeAt(0)) >>> 0;
  return `<span class="plaatje ${klas}" style="--tint:${TINTEN[h % TINTEN.length]}" aria-hidden="true">${esc(initialen(naam))}</span>`;
}

export function profielAdres(naam, basis = "") {
  return `${basis}/directory/${slug(naam)}/`;
}

// Het etiket dat zegt waar een oplossing staat in het traject.
export function etiket(o) {
  const d = o.oordeel;
  if (d?.compleet) {
    const naam = d.onderscheiding ? d.onderscheiding.naam : "Beoordeeld";
    return `<span class="etiket etiket-${d.onderscheiding?.id ?? "beoordeeld"}">${esc(naam)}</span>`;
  }
  if (d?.aantal > 0) return `<span class="etiket etiket-loopt">Bij de jury · ${d.aantal} van ${MIN_JURYLEDEN}</span>`;
  return `<span class="etiket">Genomineerd</span>`;
}

export function bewijsmeter(o) {
  const b = bewijs(o);
  const stippen = [1, 2, 3].map((n) => `<i${n <= b.niveau ? ' class="aan"' : ""}></i>`).join("");
  return `<span class="bewijs" title="${esc(b.uitleg)}"><span class="bewijs-stippen" aria-hidden="true">${stippen}</span>${esc(b.naam)}</span>`;
}

// De vingerafdruk: de vijf criteria als vijfhoek. Zonder cijfers alleen het raster.
export function vingerafdruk(perCriterium, klas = "") {
  const punt = (i, straal) => {
    const hoek = (Math.PI * 2 * i) / CRITERIA.length - Math.PI / 2;
    return [50 + Math.cos(hoek) * straal, 50 + Math.sin(hoek) * straal];
  };
  const veelhoek = (straal) => CRITERIA.map((_, i) => punt(i, straal).map((n) => n.toFixed(1)).join(",")).join(" ");
  const ringen = [14, 28, 42].map((s) => `<polygon points="${veelhoek(s)}" class="va-ring"/>`).join("");
  const assen = CRITERIA.map((_, i) => `<line x1="50" y1="50" x2="${punt(i, 42)[0].toFixed(1)}" y2="${punt(i, 42)[1].toFixed(1)}" class="va-ring"/>`).join("");
  const vorm = perCriterium
    ? `<polygon class="va-vorm" points="${CRITERIA.map((c, i) => punt(i, (perCriterium[c.id] / 10) * 42).map((n) => n.toFixed(1)).join(",")).join(" ")}"/>${CRITERIA.map((c, i) => {
        const [x, y] = punt(i, (perCriterium[c.id] / 10) * 42);
        return `<circle class="va-punt" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6"/>`;
      }).join("")}`
    : "";
  return `<svg class="vingerafdruk ${klas}" viewBox="0 0 100 100" role="img" aria-label="${perCriterium ? "Cijfers per criterium als vijfhoek" : "Nog geen cijfers"}">${ringen}${assen}${vorm}</svg>`;
}

// De naam met het jaar van ingebruikname erachter, zoals op een etiket.
export function naamMetJaar(o) {
  return `${esc(o.naam)}${o.sinds ? `<sup>(${esc(o.sinds)})</sup>` : ""}`;
}

export function kaart(o, basis = "") {
  const d = o.oordeel;
  const stand = d?.compleet ? `<span class="kaart-cijfer kaart-cijfer-${d.onderscheiding?.id ?? "beoordeeld"}">${esc(d.onderscheiding?.naam ?? "Beoordeeld")} <b>${toonCijfer(d.eindcijfer)}</b></span>` : etiket(o);
  return `<article class="kaart" data-id="${esc(o.id)}">
    <a class="kaart-link" href="${esc(adresVan(o, basis))}">
      <div class="kaart-beeld">${poster(o)}</div>
      <div class="kaart-lijf">
        <h3>${naamMetJaar(o)}</h3>
        <p class="kaart-org">${esc(o.organisatie)}</p>
        <p class="kaart-voet"><span>${esc(o.sector)}</span>${stand}</p>
      </div>
    </a>
  </article>`;
}

function veiligAdres(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

const HERKOMST = {
  onafhankelijk: "Onafhankelijk vastgesteld",
  organisatie: "Cijfer van de organisatie zelf",
  leverancier: "Cijfer van de leverancier",
};

// Het scoreblok: eindcijfer, de vijf criteria en de vingerafdruk. Zonder
// cijfers dezelfde opbouw, met lege plekken en de reden erbij.
export function scoreHTML(o, jury = []) {
  const d = o.oordeel;
  const compleet = Boolean(d?.compleet);
  const waarom = compleet
    ? `Gemiddelde van ${d.aantal} juryleden`
    : d?.aantal > 0
      ? `${d.aantal} van de minimaal ${MIN_JURYLEDEN} juryleden hebben beoordeeld. Het eindcijfer volgt zodra de beoordeling compleet is.`
      : o.herkomst === "inzending"
        ? "Deze inzending wacht op beoordeling door de jury."
        : "Door de redactie genomineerd op basis van openbare bronnen. De jury heeft deze oplossing nog niet beoordeeld.";
  const criteria = CRITERIA.map((c) => {
    const cijfer = compleet ? d.perCriterium[c.id] : null;
    return `<li><span class="score-naam">${esc(c.naam)}</span><span class="score-gewicht">${c.gewicht}%</span><span class="balk" aria-hidden="true"><i style="width:${cijfer ? cijfer * 10 : 0}%"></i></span><b>${cijfer ? toonCijfer(cijfer) : "–"}</b></li>`;
  }).join("");
  let stemmen = "";
  if (compleet) {
    const namen = new Map(jury.map((j) => [j.id, j]));
    const rijen = d.stemmen
      .slice()
      .sort((a, b) => b.cijfer - a.cijfer)
      .map((s) => {
        const lid = namen.get(s.jurylid);
        const naam = lid?.naam ?? "Jurylid";
        return `<tr><th scope="row">${plaatje(naam)}<span><b>${esc(naam)}</b>${lid ? `<small>${esc([lid.functie, lid.organisatie].filter(Boolean).join(", "))}</small>` : ""}</span></th>${CRITERIA.map((c) => `<td data-kop="${esc(c.naam)}">${s.scores[c.id]}</td>`).join("")}<td class="stem-totaal">${toonCijfer(s.cijfer)}</td></tr>${s.toelichting ? `<tr class="stem-toelichting"><td colspan="${CRITERIA.length + 2}">${esc(s.toelichting)}</td></tr>` : ""}`;
      })
      .join("");
    stemmen = `<div class="stemmen-rol"><table class="stemmen"><thead><tr><th scope="col">Jury</th>${CRITERIA.map((c) => `<th scope="col">${esc(c.naam)}</th>`).join("")}<th scope="col">Cijfer</th></tr></thead><tbody>${rijen}</tbody></table></div>`;
  }
  const soort = compleet ? (d.onderscheiding?.id ?? "beoordeeld") : "leeg";
  return `<div class="score score-${soort}">
    <div class="score-eind">
      <p class="meta">Oordeel van de jury</p>
      <p class="score-cijfer">${compleet ? toonCijfer(d.eindcijfer) : "–"}<sup>(/10)</sup></p>
      <p class="score-uitleg">${compleet ? `<b>${esc(d.onderscheiding?.naam ?? "Beoordeeld")}</b> · ` : ""}${esc(waarom)}</p>
    </div>
    <ul class="score-criteria">${criteria}</ul>
    <div class="score-afdruk">${vingerafdruk(compleet ? d.perCriterium : null)}</div>
  </div>${stemmen}`;
}

export function detailHTML(o, basis = "") {
  const bronnen = (o.bronnen ?? [])
    .map((b, i) => {
      const adres = veiligAdres(b.url);
      const titel = adres ? `<a href="${esc(adres)}" rel="noopener nofollow">${esc(b.titel)}</a>` : esc(b.titel);
      return `<li><span class="bron-nr">${String(i + 1).padStart(2, "0")}</span><span>${titel}<small>${esc([b.uitgever, datumTekst(b.datum)].filter(Boolean).join(" · "))}</small></span></li>`;
    })
    .join("");
  const eersteBron = veiligAdres(o.bronnen?.[0]?.url);
  const makers = (o.gebouwdMet ?? []).map((m) => `<a class="naamlink" href="${profielAdres(m, basis)}">${esc(m)}</a>`).join("");

  return `<header class="detail-kop">
    <div class="breed"><p class="kruimel"><a href="${basis}/oplossingen/">Oplossingen</a><span aria-hidden="true">/</span><a href="${basis}/oplossingen/?sector=${encodeURIComponent(o.sector)}">${esc(o.sector)}</a></p></div>
    <h1 class="${lengteKlas(o.naam)}">${naamMetJaar(o)}</h1>
    <div class="breed detail-regel">
      <p class="detail-credits"><span class="meta">Van</span><a class="naamlink" href="${profielAdres(o.organisatie, basis)}">${esc(o.organisatie)}</a>${makers ? `<span class="meta">Gebouwd met</span>${makers}` : ""}</p>
      <p class="detail-acties"><span data-etiket>${etiket(o)}</span>${eersteBron ? `<a class="knop knop-klein" href="${esc(eersteBron)}" rel="noopener nofollow">Lees de bron <span aria-hidden="true">↗</span></a>` : ""}<button class="knop knop-lijn knop-klein" type="button" data-deel>Kopieer de link</button></p>
    </div>
  </header>
  <div class="breed"><div class="podium" style="${vlakStijl(o)}">${poster(o)}</div></div>
  <nav class="breed anker" aria-label="Op deze pagina"><a href="#oordeel">Oordeel</a><a href="#over">Over</a><a href="#resultaat">Resultaat</a><a href="#bronnen">Bronnen</a></nav>
  <section class="breed detail-deel" id="oordeel"><h2 class="sr">Oordeel van de jury</h2><div id="jurypaneel" aria-live="polite">${scoreHTML(o)}</div></section>
  <div class="breed detail-lijf">
    <div class="detail-tekst">
      <section id="over">
        <p class="intro">${esc(o.kort)}</p>
        <p>${esc(o.beschrijving)}</p>
        ${o.opvallend ? `<h2>Waarom dit opvalt</h2><p>${esc(o.opvallend)}</p>` : ""}
      </section>
      <section id="resultaat">
        <h2>Resultaat</h2>
        ${
          o.resultaat
            ? `<blockquote class="resultaat"><p>${esc(o.resultaat.tekst)}</p><footer>${esc(HERKOMST[o.resultaat.herkomst] ?? "")}</footer></blockquote>`
            : `<p class="gedempt">In de bronnen staat geen gemeten resultaat.</p>`
        }
        <p class="bewijs-regel">${bewijsmeter(o)}<a href="/werkwijze/#bewijs">Wat betekent dit?</a></p>
      </section>
      <section id="bronnen">
        <h2>Bronnen</h2>
        <ol class="bronnen">${bronnen}</ol>
        ${o.gecontroleerd ? `<p class="voetnoot">Bronnen gelezen op ${esc(datumTekst(o.gecontroleerd))}. De beschrijving is van de redactie.</p>` : ""}
      </section>
    </div>
    <aside class="detail-zij">
      <dl class="feiten">
        <div><dt>Sector</dt><dd><a href="${basis}/oplossingen/?sector=${encodeURIComponent(o.sector)}">${esc(o.sector)}</a></dd></div>
        <div><dt>Soort</dt><dd><a href="${basis}/oplossingen/?type=${encodeURIComponent(o.type)}">${esc(o.type)}</a></dd></div>
        <div><dt>Status</dt><dd>${esc(o.sinds ? `${o.status}, sinds ${o.sinds}` : o.status)}</dd></div>
        <div><dt>Genomineerd</dt><dd>${esc(datumTekst(o.toegevoegd))}${o.herkomst === "inzending" ? ", ingezonden" : ", door de redactie"}</dd></div>
      </dl>
      <div id="in-collecties"></div>
      <div class="kader">
        <h2>Is dit jullie oplossing?</h2>
        <p>Vul de beschrijving aan, verbeter een fout of laat de vermelding weghalen.</p>
        <a class="pijl" href="/inzenden/?soort=aanvulling&amp;over=${encodeURIComponent(o.id)}">Stuur een aanvulling</a>
      </div>
    </aside>
  </div>`;
}

// Eén regel in de directory.
export function profielRij(p, plek, basis = "") {
  return `<li class="dir-rij"><a href="${profielAdres(p.naam, basis)}">
    <span class="dir-plek">${String(plek).padStart(2, "0")}</span>
    ${plaatje(p.naam)}
    <span class="dir-naam"><b>${esc(p.naam)}</b><small>${esc(p.rol)}</small></span>
    <span class="dir-sectoren">${p.sectoren.slice(0, 3).map((s) => `<i>${esc(s)}</i>`).join("")}</span>
    <span class="dir-tel"><b>${p.oplossingen.length}</b><small>Werk</small></span>
    <span class="dir-tel"><b>${p.wairthy ?? 0}</b><small>Wairthy</small></span>
    <span class="dir-tel"><b>${p.eervol ?? 0}</b><small>Eervol</small></span>
  </a></li>`;
}
