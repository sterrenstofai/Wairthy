import { laadData, toonFout, menu, BASIS } from "./kern.js";
import { profielRij } from "./weergave.js";
import { directoryMetStand } from "./indeling.js";

menu();
const doel = document.querySelector("#directory-lijst");
const zoek = document.querySelector("#directory-zoek");
let rol = "";

try {
  const { oplossingen } = await laadData();
  const alle = directoryMetStand(oplossingen);
  const toon = () => {
    const tekst = zoek.value.trim().toLowerCase();
    const lijst = alle.filter((p) => (!rol || p.rollen.has(rol)) && (!tekst || p.naam.toLowerCase().includes(tekst)));
    doel.innerHTML = lijst.length ? `<ol class="dir">${lijst.map((p) => profielRij(p, alle.indexOf(p) + 1, BASIS)).join("")}</ol>` : `<p class="melding">Geen profielen gevonden.</p>`;
  };
  for (const tab of document.querySelectorAll("[data-rol]")) {
    tab.addEventListener("click", () => {
      rol = tab.dataset.rol;
      for (const t of document.querySelectorAll("[data-rol]")) t.setAttribute("aria-selected", String(t === tab));
      toon();
    });
  }
  zoek.addEventListener("input", toon);
  toon();
} catch (fout) {
  toonFout(doel, fout);
}
