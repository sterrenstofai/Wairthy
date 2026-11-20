// Zet het thema voordat de pagina wordt getekend, zodat er geen flits is.
// Geen module: dit script moet vóór de opmaak draaien.
(function () {
  var thema = null;
  try {
    thema = localStorage.getItem("wy-thema");
  } catch (e) {
    /* geen opslag */
  }
  if (thema !== "licht" && thema !== "donker") thema = matchMedia("(prefers-color-scheme: dark)").matches ? "donker" : "licht";
  document.documentElement.dataset.thema = thema;
})();
