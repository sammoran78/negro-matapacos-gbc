# Visual references used for the expansion

Researched 4 October 2026. The requested concreted Santiago river is **Río Mapocho**. The city's tourism office describes its channeling and the curved/straight steel truss bridges. The stage uses engineered retaining walls, piers, overpasses, upper-bank trees and muddy water, with a separate authored dry route for gameplay.

- [Santiago Turismo: metal bridges over the Mapocho](https://www.santiagoturismo.cl/en/metal-bridges-over-the-mapocho-river/)
- [Santiago Turismo: Teatro del Puente / Vicente Huidobro bridge](https://www.santiagoturismo.cl/es/teatro-del-puente/)
- [Wikimedia Commons: Mapocho River photographs](https://commons.wikimedia.org/wiki/Category:Mapocho_River)

La Moneda's pale long facade, repeated windows, central entrance and formal plaza inform the final stage. This is a compressed side-on interpretation rather than a scale architectural model.

- [Consejo de Monumentos Nacionales: Palacio La Moneda](https://www.monumentos.gob.cl/patrimonio-mundial/tentativa/palacio-la-moneda)
- [Gobierno de Chile: Patrimonio La Moneda](https://www.gob.cl/patrimoniolamoneda/)
- [Archivo Nacional: El Frontis del Palacio de La Moneda](https://archivospresidenciales.archivonacional.cl/index.php/el-frontis-del-palacio-de-la-moneda)

The ending standard uses the national flag with a central coat of arms; the 32 x 24 rendition simplifies its heraldic detail. The president is fictional and timeless, with a tricolor sash.

- [Visual overview of Chilean presidential symbols](https://es.wikipedia.org/wiki/S%C3%ADmbolos_presidenciales_de_Chile)
- [Museo Histórico Gabriel González Videla: tricolor presidential sash](https://www.museohistoricolaserena.gob.cl/noticias/banda-presidencial-de-gabriel-gonzalez-videla)
- [Gobierno de Chile: national symbols and coat of arms](https://www.gob.cl/nuestro-pais/)

The user's two attached Santiago panoramas supplied the art direction: broad sky, snowy Andes, overlapping city blocks and trees. Local copies are retained in `references/santiago-panorama-1.png` and `references/santiago-panorama-2.jpg`. New stage backgrounds were generated separately for Alameda, Campus, Plaza, Mapocho and La Moneda with the built-in image_gen tool. Full prompts are in `expansion-prompts.json`; native GBC exports come from the deterministic Node compiler. Web photographs were consulted as visual references, not copied into the game assets.

Hardware design was checked against [GBDK background/attribute documentation](https://gbdk.org/docs/api/gb_8h.html): per-tile palettes and bank bit 3, VBK pattern/map writes and the overlap of sprite/background tile ranges. Layered previews are compositions in one background plane; LCD band timing remains an implementation task.
