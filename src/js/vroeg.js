// Draait vóór de pagina wordt getekend. Een overgang tussen pagina's kan
// worden afgebroken, bijvoorbeeld als een pagina meteen doorverwijst. Dat
// is geen fout; zonder deze regels meldt de browser het wel als een.
(function () {
  function stil(gebeurtenis) {
    var overgang = gebeurtenis.viewTransition;
    if (!overgang) return;
    overgang.ready.catch(function () {});
    overgang.finished.catch(function () {});
  }
  addEventListener("pagereveal", stil);
  addEventListener("pageswap", stil);
})();
