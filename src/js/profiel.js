import { laadData, menu, verversKaarten } from "./kern.js";
import { directoryMetStand } from "./indeling.js";
import { toonCijfer } from "./score.js";

menu();
try {
  const { oplossingen } = await laadData();
  verversKaarten(oplossingen);
  const p = directoryMetStand(oplossingen).find((x) => x.slug === document.querySelector("#profiel").dataset.slug);
  if (p) {
    const dd = document.querySelectorAll("#profiel-stand dd");
    [p.oplossingen.length, p.wairthy, p.eervol, p.hoogste === null ? "–" : toonCijfer(p.hoogste)].forEach((w, i) => (dd[i].textContent = w));
  }
} catch (fout) {
  console.error(fout);
}
