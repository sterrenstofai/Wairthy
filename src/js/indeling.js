// Hoe de selectie is ingedeeld: collecties en de directory van
// organisaties en makers. Geen DOM, zodat het bouwscript en de browser
// dezelfde indeling maken.
import { bewijs } from "./score.js";

export function slug(naam) {
  return String(naam)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Een collectie is een vaste regel over de gegevens, geen handwerk: wie
// aan de regel voldoet, staat erin.
export const COLLECTIES = [
  { id: "onafhankelijk-bewezen", naam: "Onafhankelijk bewezen", uitleg: "Oplossingen waarvan het resultaat is vastgesteld door een partij zonder belang.", hoort: (o) => bewijs(o).niveau === 3 },
  { id: "in-gesprek-met-klanten", naam: "In gesprek met klanten", uitleg: "Assistenten die rechtstreeks met klanten, patiënten of burgers praten.", hoort: (o) => o.type === "Assistent voor klanten" },
  { id: "collega-ai", naam: "Collega AI", uitleg: "Assistenten die medewerkers helpen bij hun dagelijkse werk.", hoort: (o) => o.type === "Assistent voor medewerkers" },
  { id: "agents-aan-het-werk", naam: "Agents aan het werk", uitleg: "Oplossingen die zelf stappen zetten en handelingen uitvoeren.", hoort: (o) => o.type === "Agent" },
  { id: "kijken-en-luisteren", naam: "Kijken en luisteren", uitleg: "Beeldherkenning en spraak: AI die ziet, hoort en vastlegt.", hoort: (o) => o.type === "Beeldherkenning" || o.type === "Spraak en verslaglegging" },
  { id: "vooruitkijkers", naam: "Vooruitkijkers", uitleg: "Modellen die voorspellen wat er gaat gebeuren, zodat mensen eerder kunnen ingrijpen.", hoort: (o) => o.type === "Voorspelmodel" },
  { id: "in-de-spreekkamer", naam: "In de spreekkamer", uitleg: "AI in ziekenhuizen, huisartsenpraktijken en de rest van de zorg.", hoort: (o) => o.sector === "Zorg" },
  { id: "publieke-zaak", naam: "Publieke zaak", uitleg: "Oplossingen bij de overheid en in het onderwijs.", hoort: (o) => o.sector === "Overheid" || o.sector === "Onderwijs" },
  { id: "nog-in-de-proef", naam: "Nog in de proef", uitleg: "Pilots die publiek worden getest en nog niet breed zijn ingevoerd.", hoort: (o) => o.status === "Pilot" },
];

const MIN_IN_COLLECTIE = 3;

export function collecties(oplossingen) {
  return COLLECTIES.map((c) => ({ ...c, oplossingen: oplossingen.filter(c.hoort) })).filter((c) => c.oplossingen.length >= MIN_IN_COLLECTIE);
}

export function collectiesVan(oplossing, oplossingen) {
  return collecties(oplossingen).filter((c) => c.hoort(oplossing));
}

// De directory: iedereen die een oplossing gebruikt (organisatie) of heeft
// gebouwd (maker), met de oplossingen waarbij die naam staat.
export function directory(oplossingen) {
  const profielen = new Map();
  const voegToe = (naam, rol, o) => {
    const id = slug(naam);
    if (!id) return;
    if (!profielen.has(id)) profielen.set(id, { slug: id, naam, rollen: new Set(), oplossingen: [] });
    const p = profielen.get(id);
    p.rollen.add(rol);
    if (!p.oplossingen.includes(o)) p.oplossingen.push(o);
  };
  for (const o of oplossingen) {
    voegToe(o.organisatie, "Organisatie", o);
    for (const maker of o.gebouwdMet ?? []) voegToe(maker, "Maker", o);
  }
  return [...profielen.values()]
    .map((p) => ({ ...p, rol: p.rollen.size === 2 ? "Organisatie en maker" : [...p.rollen][0], sectoren: [...new Set(p.oplossingen.map((o) => o.sector))] }))
    .sort((a, b) => b.oplossingen.length - a.oplossingen.length || a.naam.localeCompare(b.naam, "nl"));
}

// De directory met de onderscheidingen erbij, gesorteerd zoals de
// ranglijst: eerst Wairthy, dan eervolle vermeldingen, dan het aantal.
// Verwacht dat elke oplossing haar oordeel al heeft.
export function directoryMetStand(oplossingen) {
  return directory(oplossingen)
    .map((p) => {
      const klaar = p.oplossingen.filter((o) => o.oordeel?.compleet);
      const telSoort = (id) => klaar.filter((o) => o.oordeel.onderscheiding?.id === id).length;
      return { ...p, wairthy: telSoort("wairthy"), eervol: telSoort("eervol"), hoogste: klaar.length ? Math.max(...klaar.map((o) => o.oordeel.eindcijfer)) : null };
    })
    .sort((a, b) => b.wairthy - a.wairthy || b.eervol - a.eervol || b.oplossingen.length - a.oplossingen.length || a.naam.localeCompare(b.naam, "nl"));
}
