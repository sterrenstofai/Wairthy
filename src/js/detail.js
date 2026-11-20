import { laadData, toonFout, menu, onthul, BASIS } from "./kern.js";
import { kaart, esc, adresVan, etiket, detailHTML, scoreHTML } from "./weergave.js";
import { poster } from "./poster.js";
import { collectiesVan } from "./indeling.js";

menu();

const doel = document.querySelector("#oplossing");

function buur(o, richting) {
  return `<a class="buur buur-${richting}" href="${esc(adresVan(o, BASIS))}" data-wijzer="${richting === "vorige" ? "←" : "→"}"><span class="buur-beeld" aria-hidden="true">${poster(o)}</span><span class="buur-tekst"><span class="meta">${richting === "vorige" ? "Vorige" : "Volgende"}</span><span class="buur-naam">${esc(o.naam)}</span><span class="buur-org">${esc(o.organisatie)}</span></span></a>`;
}

try {
  const { oplossingen, jury } = await laadData();
  const id = doel.dataset.id ?? new URLSearchParams(location.search).get("id");
  const o = oplossingen.find((x) => x.id === id);
  if (!o) {
    document.title = "Niet gevonden · Wairthy";
    doel.innerHTML = `<div class="breed nietgevonden"><h1>Deze oplossing staat niet in de selectie.</h1><p>Misschien is de vermelding verwijderd. <a href="${BASIS}/oplossingen/">Bekijk alle oplossingen</a></p></div>`;
  } else {
    // Vaste pagina's hebben hun tekst al; een later gepubliceerde
    // inzending wordt hier in de browser opgebouwd.
    if (!doel.dataset.id) {
      document.title = `${o.naam} van ${o.organisatie} · Wairthy`;
      doel.innerHTML = detailHTML(o, BASIS);
    }
    doel.querySelector("#jurypaneel").innerHTML = scoreHTML(o, jury);
    doel.querySelector("[data-etiket]").innerHTML = etiket(o);

    const deel = doel.querySelector("[data-deel]");
    deel?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        deel.textContent = "Link gekopieerd";
      } catch {
        deel.textContent = "Kopiëren lukt niet in deze browser";
      }
      setTimeout(() => (deel.textContent = "Kopieer de link"), 2500);
    });

    const hoortBij = collectiesVan(o, oplossingen);
    if (hoortBij.length) {
      doel.querySelector("#in-collecties").innerHTML = `<div class="tags"><p class="meta">In collecties</p>${hoortBij.map((c) => `<a class="chip" href="${BASIS}/collecties/${c.id}/">${esc(c.naam)}</a>`).join("")}</div>`;
    }

    const rij = oplossingen.slice().sort((a, b) => a.organisatie.localeCompare(b.organisatie, "nl") || a.naam.localeCompare(b.naam, "nl"));
    const plek = rij.indexOf(o);
    if (rij.length > 1) {
      document.querySelector("#buren").innerHTML = buur(rij[(plek - 1 + rij.length) % rij.length], "vorige") + buur(rij[(plek + 1) % rij.length], "volgende");
    }

    const verwant = oplossingen.filter((x) => x.sector === o.sector && x !== o).slice(0, 4);
    if (verwant.length) {
      document.querySelector("#verwant").innerHTML = `<div class="blok-kop"><h2>Meer in ${esc(o.sector)}</h2><a class="pijl" href="${BASIS}/oplossingen/?sector=${encodeURIComponent(o.sector)}">Alles in deze sector</a></div><div class="raster">${verwant.map((x) => kaart(x, BASIS)).join("")}</div>`;
    }

    // Markeer in de ankerbalk het deel dat in beeld is.
    const links = [...doel.querySelectorAll(".anker a")];
    const kijker = new IntersectionObserver(
      (items) => {
        for (const item of items) if (item.isIntersecting) for (const l of links) l.classList.toggle("actief", l.hash === `#${item.target.id}`);
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    for (const l of links) {
      const deelEl = doel.querySelector(l.hash);
      if (deelEl) kijker.observe(deelEl);
    }
    onthul();
  }
} catch (fout) {
  toonFout(document.querySelector("#jurypaneel") ?? doel, fout);
}
