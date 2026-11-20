// Voor pagina's waarvan de kaarten al in de HTML staan: zet er de actuele
// stand van de jury op.
import { laadData, menu, verversKaarten } from "./kern.js";
menu();
laadData().then(({ oplossingen }) => verversKaarten(oplossingen)).catch(console.error);
