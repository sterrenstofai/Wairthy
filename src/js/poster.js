// Het beeld van een oplossing. We tonen geen schermafbeeldingen van
// andermans werk. Elke oplossing krijgt een eigen affiche: een effen vlak in
// de kleur van de sector, met daarop een wit blad met een lijntekening. Het
// motief volgt het soort oplossing, en de precieze tekening hangt vast aan
// het id. Dit bestand heeft geen DOM nodig, zodat het bouwscript dezelfde
// affiches kan maken als de browser.

const INKT = "#131313";
const BLAD = "#fbfbf9";

export const SECTORKLEUR = {
  Retail: "#f2c230",
  "Financiën": "#2f8f6b",
  Zorg: "#f0a8a0",
  Overheid: "#2f5bff",
  Mobiliteit: "#b7a6f0",
  Media: "#ff4a1c",
  "Zakelijke software": "#c9e265",
  Industrie: "#b9b4a8",
  Onderwijs: "#8fd0e6",
  Juridisch: "#d9a7c7",
  Logistiek: "#e3d3a0",
  Energie: "#ffe04a",
  "Agri en food": "#9cc98a",
  Reizen: "#5fb7b0",
};

export function kleuren(sector) {
  const bg = SECTORKLEUR[sector] ?? "#dcdad3";
  return { bg, vorm: INKT, accent: INKT, licht: BLAD };
}

function hash(tekst) {
  let h = 2166136261;
  for (let i = 0; i < tekst.length; i++) {
    h ^= tekst.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Kleine, vaste toevalsgenerator: hetzelfde id geeft altijd dezelfde tekening.
function toeval(zaad) {
  let a = zaad || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n) => Math.round(n * 10) / 10;
const LIJN = `fill="none" stroke="${INKT}" stroke-width="1.6"`;

// Alle motieven tekenen binnen het blad: x 100 tot 300, y 60 tot 240.

function gesprek(r, k) {
  const b1 = 70 + Math.floor(r() * 60);
  const b2 = 80 + Math.floor(r() * 70);
  const b3 = 50 + Math.floor(r() * 40);
  return `<rect x="112" y="76" width="${b1}" height="30" ${LIJN}/><path d="M112 106v10l12-10" ${LIJN}/>
    <rect x="${288 - b2}" y="126" width="${b2}" height="44" fill="${k.bg}" stroke="${INKT}" stroke-width="1.6"/><path d="M288 170v10l-12-10" fill="${k.bg}" stroke="${INKT}" stroke-width="1.6"/>
    <path d="M${300 - b2} 142h${b2 - 28}M${300 - b2} 154h${b2 - 50}" ${LIJN}/>
    <rect x="112" y="194" width="${b3 + 30}" height="30" ${LIJN}/>
    ${[0, 1, 2].map((d) => `<rect class="p-punt" style="animation-delay:${d * 0.18}s" x="${124 + d * 14}" y="206" width="6" height="6" fill="${INKT}"/>`).join("")}`;
}

function document_(r, k) {
  const fel = 2 + Math.floor(r() * 3);
  let regels = "";
  for (let i = 0; i < 7; i++) {
    const breed = 50 + r() * 80;
    regels += i === fel ? `<rect x="146" y="${99 + i * 18}" width="${r1(breed)}" height="10" fill="${k.bg}" stroke="${INKT}" stroke-width="1.2"/>` : `<path d="M146 ${104 + i * 18}h${r1(breed)}" ${LIJN}/>`;
  }
  return `<rect x="118" y="88" width="150" height="140" ${LIJN}/><rect x="132" y="74" width="150" height="150" fill="${BLAD}" stroke="${INKT}" stroke-width="1.6"/>${regels}
    <rect class="p-knipper" x="${r1(146 + 60 + r() * 50)}" y="${97 + fel * 18}" width="3" height="14" fill="${INKT}"/>`;
}

function netwerk(r, k) {
  const punten = [];
  for (let i = 0; i < 6; i++) punten.push([r1(116 + i * 34 + (r() - 0.5) * 14), r1(84 + r() * 132)]);
  let lijnen = "";
  for (let i = 0; i < punten.length; i++) for (let j = i + 2; j < punten.length; j++) if (r() < 0.3) lijnen += `<path d="M${punten[i][0]} ${punten[i][1]}L${punten[j][0]} ${punten[j][1]}" ${LIJN} stroke-dasharray="2 5"/>`;
  const pad = punten.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  const knopen = punten.map((p, i) => (i === 3 ? `<rect x="${p[0] - 11}" y="${p[1] - 11}" width="22" height="22" fill="${k.bg}" stroke="${INKT}" stroke-width="1.6"/>` : `<rect x="${p[0] - 5}" y="${p[1] - 5}" width="10" height="10" fill="${BLAD}" stroke="${INKT}" stroke-width="1.6"/>`)).join("");
  return `${lijnen}<path class="p-trek" d="${pad}" ${LIJN} pathLength="100"/>${knopen}`;
}

function kromme(r, k) {
  const punten = [];
  let y = 190 + r() * 20;
  for (let i = 0; i < 8; i++) {
    y = Math.max(86, Math.min(210, y + (r() - 0.62) * 44));
    punten.push([116 + i * 24, r1(y)]);
  }
  const lijn = (ps) => ps.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  const nu = 4;
  const toekomst = punten.slice(nu);
  const band = `${lijn(toekomst.map((p, i) => [p[0], p[1] - 4 - i * 8]))} ${toekomst.map((p, i) => [p[0], p[1] + 4 + i * 8]).reverse().map((p) => `L${p[0]} ${r1(p[1])}`).join(" ")} Z`;
  return `<path d="M112 74V226H292" ${LIJN}/>${[0, 1, 2, 3].map((i) => `<path d="M108 ${96 + i * 36}h4" ${LIJN}/>`).join("")}
    <path d="${band}" fill="${k.bg}" stroke="${INKT}" stroke-width="1.2"/>
    <path d="${lijn(punten.slice(0, nu + 1))}" ${LIJN} stroke-width="2"/>
    <path class="p-streep" d="${lijn(toekomst)}" ${LIJN} stroke-dasharray="2 5"/>
    <path d="M${punten[nu][0]} 74V226" ${LIJN} stroke-dasharray="2 4" stroke-width="1"/>
    ${punten.slice(0, nu + 1).map((p) => `<rect x="${p[0] - 3.5}" y="${p[1] - 3.5}" width="7" height="7" fill="${BLAD}" stroke="${INKT}" stroke-width="1.6"/>`).join("")}`;
}

function kader(r, k) {
  let vakjes = "";
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 7; x++) {
      const o = r();
      vakjes += `<rect x="${112 + x * 25}" y="${76 + y * 25}" width="21" height="21" fill="${o > 0.86 ? INKT : o > 0.66 ? k.bg : "none"}" stroke="${INKT}" stroke-width="${o > 0.4 ? 1.2 : 0.5}"/>`;
    }
  }
  const doos = (x, y, b, h) => `<path d="M${x} ${y + 12}V${y}H${x + 12}M${x + b - 12} ${y}H${x + b}V${y + 12}M${x + b} ${y + h - 12}V${y + h}H${x + b - 12}M${x + 12} ${y + h}H${x}V${y + h - 12}" ${LIJN} stroke-width="2.6"/>`;
  const x1 = 108 + Math.floor(r() * 3) * 25;
  const y1 = 72 + Math.floor(r() * 2) * 25;
  return `${vakjes}${doos(x1, y1, 79, 79)}${doos(x1 + 75 + Math.floor(r() * 2) * 25, y1 + 50 + Math.floor(r() * 2) * 25, 54, 54)}
    <path class="p-scan" d="M100 60H300" stroke="${INKT}" stroke-width="1" fill="none"/>`;
}

function golf(r, k) {
  let staven = "";
  for (let i = 0; i < 14; i++) {
    const h = 10 + r() * 110 * Math.sin(((i + 1) / 15) * Math.PI);
    staven += `<path class="p-staaf" style="animation-delay:${r1(i * 0.07)}s" d="M${114 + i * 7} ${r1(150 - h / 2)}V${r1(150 + h / 2)}" ${LIJN} stroke-width="2.4"/>`;
  }
  let regels = "";
  for (let i = 0; i < 6; i++) regels += i === 0 ? `<rect x="234" y="${95 + i * 18}" width="${r1(30 + r() * 20)}" height="9" fill="${k.bg}" stroke="${INKT}" stroke-width="1.2"/>` : `<path d="M234 ${100 + i * 18}h${r1(26 + r() * 30)}" ${LIJN}/>`;
  return `${staven}<rect x="224" y="80" width="68" height="140" ${LIJN}/>${regels}<path d="M210 150h10m-4-4 4 4-4 4" ${LIJN}/>`;
}

function tokens(r, k) {
  let uit = "";
  let y = 78;
  for (let rij = 0; rij < 6; rij++) {
    let x = 112;
    while (x < 270) {
      const b = Math.min(18 + Math.floor(r() * 46), 290 - x);
      const soort = r();
      uit += `<rect ${soort > 0.85 ? 'class="p-knipper" style="animation-delay:' + r1(r() * 2) + 's"' : ""} x="${x}" y="${y}" width="${b}" height="16" fill="${soort > 0.85 ? k.bg : soort > 0.72 ? INKT : "none"}" stroke="${INKT}" stroke-width="1.2"/>`;
      x += b + 6;
    }
    y += 26;
  }
  return uit;
}

const MOTIEF = {
  "Assistent voor klanten": gesprek,
  "Assistent voor medewerkers": document_,
  Agent: netwerk,
  Voorspelmodel: kromme,
  Beeldherkenning: kader,
  "Spraak en verslaglegging": golf,
  Taalmodel: tokens,
};

// Paskruisjes in de hoeken, zoals op een drukproef.
const kruis = (x, y) => `<path d="M${x - 5} ${y}h10M${x} ${y - 5}v10" stroke="${INKT}" stroke-width="1" fill="none"/>`;

export function poster(o) {
  const k = kleuren(o.sector);
  const r = toeval(hash(o.id));
  const teken = MOTIEF[o.type] ?? tokens;
  return `<svg class="poster" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Affiche van ${String(o.naam).replace(/[&<>"]/g, "")}" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="${k.bg}"/>${kruis(24, 24)}${kruis(376, 24)}${kruis(24, 276)}${kruis(376, 276)}<rect x="100" y="60" width="200" height="180" fill="${BLAD}"/>${teken(r, k)}</svg>`;
}
