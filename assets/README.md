# Negro Matapacos pixel art

The pack is now integrated into the playable GBC prototype in `../platformer.c`. See the root README for ROM build, controls and emulator verification. This directory's `review.html` remains an art/state study; gameplay recordings and test reports are generated in `../build/`.

This expanded art pass includes native sprite sheets, five stage tilesets, five scenic depth backdrops, a Santiago world map with unlock states, a palace medal ceremony, startup/UI screens, animation previews, and GBDK-compatible data. Source illustrations use the built-in image_gen tool; production exports are compiled locally into fixed dimensions, binary sprite transparency, 5-bit GBC colors, and 2bpp tile data.

**Start with `review.html` or `previews/expanded-overview.png`.** The HTML review demonstrates language selection before Start Game, controls, the world map before Alameda, locked stages, simulated rescues/unlocks and the three-beat finale in either language. It compares 16- and 24-pixel dog animation and demonstrates scenic scrolling bands for each stage. These are art/state previews, not gameplay. Open the HTML in a browser directly from this directory.

## Files

| Directory / file | Purpose |
| --- | --- |
| `source/` | Original illustrations and sibling revisions, five depth backgrounds, river/palace atlases, world map, ceremony figures and presidential standard |
| `native/` | Actual game-size PNGs; sprite PNGs use transparent backgrounds |
| `previews/` | Nearest-neighbor enlarged PNGs and run/bark GIFs |
| `gbdk/` | Generated `const` C arrays, headers, and raw 2bpp tile patterns |
| `manifest.json` | Frame names, palette slots, tile IDs, stage metatiles, font IDs, mockup placements, and budgets |
| `validation.json` | Export validation results |
| `prompts.json` | Full generation prompts and the officer-ladder correction prompt |
| `flag-revision-prompts.json` | Built-in image_gen prompts for the Chilean flags |
| `expansion-prompts.json` | Full built-in generation prompts for this expansion |
| `REFERENCES.md` | River/palace/flag research links and the user's panorama references |
| `localization.json` | Paired English/Spanish interface and dialogue strings; preview locale and artwork-language policy |
| `review.html` | Local visual review gallery |

Use `native/` and `gbdk/` for game integration. The enlarged source illustrations and review images are not production-resolution assets.

## Matapacos

`native/dog.png` is 64 x 64 pixels, arranged as four columns and four rows of 16 x 16 frames. Every pose requires four 8 x 8 hardware sprites. The revised silhouette fills up to 15 pixels and uses the last cell row as its foot baseline. All poses face right. Sprite palette 0 contains transparency, near-black fur, gray highlights, and a red bandana. `source/dog-v2.png` supplies the revision; the original source is retained.

| Frame | Name | Intended use |
| --- | --- | --- |
| 0 | idle_0 | Resting stance |
| 1 | idle_1 | Tail movement |
| 2 | run_contact | Run cycle contact |
| 3 | run_passing | Run cycle passing |
| 4 | run_airborne | Stretched stride |
| 5 | run_recoil | Recoil stride |
| 6 | jump_rise | Upward jump |
| 7 | jump_fall | Descending jump |
| 8 | bark_0 | Open muzzle |
| 9 | bark_1 | Bark emphasis / bandana movement |
| 10 | hurt | Crouched reaction |
| 11 | celebrate | Sitting rescue pose |
| 12 | run_lift | After contact |
| 13 | run_extend | After passing |
| 14 | run_landing | After airborne stretch |
| 15 | run_push | After recoil |

The run order is **2, 12, 3, 13, 4, 14, 5, 15**, with an 80 ms art-preview cadence. Timing and sequences are in the manifest. Sprint can use a faster cadence linked to travel speed. The full cell remains the planned collision box. These suggestions do not implement movement or physics.

`native/dog-detail-24.png` is a separate 96 x 96 comparison atlas with 24 x 24 cells. Its ROM export, `gbdk/dog_detail_24.*`, contains 144 tiles (16 frames × 9 tiles). It is an optional alternative requiring nine OAM objects, a larger collision box and renewed scanline checks. Stream only the active 144-byte frame into nine reserved tile slots if selected; do not load all 144 patterns over the current bank layout. The original 16 x 16/four-sprite specification remains the default.

`sprites_frame_tiles` stores four tile IDs per frame in this order:

1. Top left at (0, 0).
2. Top right at (8, 0).
3. Bottom left at (0, 8).
4. Bottom right at (8, 8).

To face left, swap left/right quadrants and set horizontal flip on each sprite. Keep the same world-space anchor and collision box. Hide unused sprite objects rather than wrapping their screen coordinates.

## Characters, objects, and effects

`native/actors.png` is a 64 x 64 sheet of sixteen 16 x 16 cells. Its palette slot varies by frame and is recorded in `sprites_frame_palettes` and the manifest.

| Row | Left to right |
| --- | --- |
| 0 | Officer patrol 0, patrol 1, stunned, climbing |
| 1 | Red-shirt student idle/wave, teal-shirt student idle/wave |
| 2 | Empanada, extra-life dog head, Chilean checkpoint flag, stun star |
| 3 | Small/large bark wave, small/large dust puff |

The officer's climbing frame contains the character alone; the ladder belongs to the campus background tileset.

`native/icons.png` contains the empanada, extra-life head, and stun star as true 8 x 8 cells in a 24 x 8 sheet. Use `sprites_icon_tiles` and `sprites_icon_palettes` to draw each with **one** hardware sprite. Tile IDs are deduplicated and must come from those tables or the manifest. Frame quadrants are also independently packed: never assume four consecutive IDs or infer an actor's global frame index from the dog count.

Sprite palette slots:

| Slot | Use | Opaque colors |
| --- | --- | --- |
| 0 | Matapacos and extra-life icon | Near-black, gray, red |
| 1 | Carabineros | Near-black, olive, skin |
| 2 | Red-shirt students | Near-black, red, skin |
| 3 | Teal-shirt students | Near-black, teal, skin |
| 4 | Empanadas | Near-black, pastry gold, toasted brown |
| 5 | Bark and dust | Near-black, gray, cream |
| 6 | Chilean checkpoint flag | Blue, red, white; the pole is blue to keep three opaque colors |
| 7 | Stun star | Near-black, gray, cream |

Sprite index 0 is transparent regardless of its RGB value. Some effect palettes intentionally give the opaque cream entry the same RGB color as the unused transparent entry.

The two large foreground flags in the title artwork and the checkpoint flag resemble Chile's flag: white upper field, red lower field, and a blue upper hoist canton with a white star. Some smaller protest flags remain red. The compiler takes only the checkpoint cell from `source/actors-chile.png`, preserving all other existing actor frames. `source/title-chile.png` supplies the revised title backdrop. Native title canton tiles explicitly use the flag palette so the tiny blue and white details survive the hardware conversion.

## Stage tilesets

Each stage has a native 64 x 64 atlas of sixteen 16 x 16 metatiles. Each metatile is four 8 x 8 background tiles. The first cell is a flat sky swatch. Source sky padding on solid top edges is trimmed during export to align the walkable surface to a tile boundary.

| Stage | Available art |
| --- | --- |
| Alameda | Sky, skyline, stucco, window, sidewalk top/fill, platform ends, bench halves, rescue barricade halves, mural halves, street lamp, arrow sign |
| Campus | Sky, campus skyline, brick, library window, roof top/fill, scaffold platform ends, braces, ladder, bookcase, entrance, ascending/descending steps, protest banner halves |
| Plaza | Dusk sky, monument skyline, stone top/fill, bus halves, bus roof/wheels, guanaco halves, cannon nozzle, warning beacon, monument steps, plinth, tear gas, water jet |
| Río Mapocho | City skyline, walkway/channel walls, bridge deck halves, steel truss, pier, dry ledge halves, barricade, ladder, drain, water, direction sign |
| La Moneda | Palace roof, plaza paving, raised platforms, column, window, arched doorway halves, barricade, stairs, hedge, empty flagpole |

Adjacent left/right halves create 32 x 16 objects. The prototype uses compact vehicle shapes appropriate to a 160-pixel-wide screen. Large vehicle bodies, banners, benches, and architecture use background tiles. Officers, students, Matapacos, and transient effects use sprites.

The rescue barricade's open state restores the underlying scenery tiles; it does not require a separate intact barricade image. The existing dust effect can provide opening feedback. The campus entrance is decorative until mechanics assign it an interaction. Stairs and monument shapes require collision definitions based on their tiles when the engine is implemented; the artwork does not implement those rules.

Each stage's `*_scene_library_tiles` C array begins with 64 entries: four tile IDs for each of the sixteen metatiles, in top-left, top-right, bottom-left, bottom-right order. Following those are the gameplay font tile IDs. The manifest exposes these IDs directly as `sheets.<stage>.cells[].tile_ids` and `sheets.<stage>.glyph_ids`. Palette slots are stage-specific; use the cell's palette attribute when placing a metatile.

## Title and UI

All screens are native 160 x 144 pixels, or 20 x 18 background tiles:

- Language-selector screen: `ENGLISH` / `ESPAÑOL`, with no Start Game option before confirmation.
- Title screen after selection: Santiago skyline, Chilean and red protest flags, large black dog portrait, red bandana, custom pixel lettering, and localized Start Game. The default screenshot shows `INICIAR JUEGO`.
- Alternate title PNG: start prompt hidden for blinking.
- Controls screen: movement, jump, bark, double-tap sprint, and pause.
- Pause screen.
- Game-over / retry screen.
- Stage-clear / students-safe screen.
- Palace rescue, medal award and raised presidential-standard screens; the earlier generic thank-you screen remains as a reusable menu study.

The title portrait is entirely background artwork. Both prompt states share one 223-pattern library. `title_screen_blink_map` and `title_screen_blink_attributes` use the same tile IDs and palettes as the main title map. Blink by updating the changed footer map entries and attributes; the portrait patterns stay loaded. Both states are verified against their native PNGs.

`native/font.png` is 128 x 32 pixels and provides 8 x 8 glyph cells with a 5 x 7 pixel drawing inside. It includes Ñ, Á, É, Í, Ó, Ú, Ü, ¡, and ¿, as well as ordinary punctuation. Its glyph order is recorded in the manifest, and the complete 54-glyph font is exported separately in `gbdk/font.*`. `font_character_codes` uses Latin-1 codepoints; the future text renderer must map its chosen string encoding to these glyph IDs. Gameplay libraries currently include letters, digits, space, and slash. Load other glyphs as needed or place the full dialogue font in another VRAM bank when implementing speech bubbles. Render counters with tiles rather than `printf()`.

Interface strings are centralized in `localization.json`: 41 stable IDs, each in English and Spanish, including map labels, locks, unlock feedback and the ceremony. The HTML flow renders the confirmed language; native PNGs show Spanish examples. Future runtime text must use this choice for menus, HUD, dialogue, prompts and the ending. World-art lettering stays Spanish. Fresh boot always asks for language; session transitions preserve it. These are mandatory requirements in `PLAN.md`.

The bottom 16 pixels of gameplay mockups are reserved for the HUD. Their labels show empanada progress, lives, and the stage name. Menu screens load their own tiles and background palettes.

## Hardware budget

| Asset library | Unique tile patterns | Limit used for validation |
| --- | ---: | ---: |
| Sprites, 32 frames plus 3 icons after tile deduplication | 117 | 128 |
| Alameda background, all metatiles and gameplay glyphs | 126 | 128 |
| Campus background, all metatiles and gameplay glyphs | 128 | 128 |
| Plaza background, all metatiles and gameplay glyphs | 125 | 128 |
| Mapocho background, all metatiles and gameplay glyphs | 125 | 128 |
| La Moneda background, all metatiles and gameplay glyphs | 126 | 128 |
| Title screen | 223 | 256 |
| Language selector | 91 | 256 |

All scenes use at most eight background palettes and eight sprite palettes. Palette colors are rounded to GBC BGR555 precision. Every sprite frame has at most three opaque colors plus transparency. Each background hardware tile uses one four-color palette.

The sample Alameda composition uses 22 hardware sprite objects and reaches 10 objects on a scanline. Campus and plaza use 18 objects, peaking at 8 per scanline. These counts include transparent portions of the allocated 8 x 8 objects, as the hardware does. The Alameda composition reaches the scanline limit, so adding another overlapping effect requires hiding or deferring an existing object. These checks validate the illustrated placements, not every possible future gameplay arrangement.

The 128-pattern split avoids sprite/background overlap in GBDK's default tile-data layout. The detailed scenic layer explicitly uses VRAM bank 1. Each scenic/composite library is at most 240 patterns; load one variant per stage. World-map states use separate scene libraries (236-247 patterns), rather than loading their union. Ceremony screens load separately; their exact counts are in the regenerated manifest.

## Scenic depth, map and finale

Each stage has `native/<stage>-depth.png` (160 x 96), three extracted sky/Andes/city strips, a platform-composite variant, and a layered 160 x 144 study. The clean and composite libraries have separate `*_depth.*` / `*_depth_composite.*` C and 2bpp exports. Their CGB attribute maps set bit 3 for bank-1 patterns. Palette indices 0-2 share the **same eight stage palettes**, not eight additional palettes.

The GBC has one background plane. Where a platform overlaps scenery, the compiler bakes the combined image into bank-1 tiles; backgrounds are opaque. These previews do not imply independent transparent layers. Use bank 0 for gameplay tile patterns and the HUD, bank 1 for either scenery variant. Load pattern bytes in the selected VBK bank, write tile maps with VBK=0 and attributes with VBK=1, then restore VBK=0. Keep the default GBDK background addressing mode and lookup IDs consistent. The bank bit in an attribute selects tile data; it is separate from the bank selected while writing maps. [GBDK background data and attributes](https://gbdk.org/docs/api/gb_8h.html)

`<stage>_layered.c/.h` supplies the full 20 x 18 tile/attribute map: upper twelve rows use `<stage>_depth_composite` bank-1 patterns, lower six use `<stage>_scene` bank-0 patterns. `native/<stage>-layered-background.png` is verified against this mixed-bank map before sprites are drawn. The manifest records both libraries and shared palettes in `layered_scenes`.

The gallery retains the earlier static/composite art studies. The playable ROM now derives separate runtime strips with `tools/build-game-assets.cjs`: sky/Andes at camera/4 on lines 0–47, city at camera/2 on lines 48–79, and full-speed terrain from line 80. Scenic pixels are converted to six stage palettes with an atmospheric tint; palette 6 supplies saturated orange/gold terrain and palette 7 supplies the HUD. Eight new foreground patterns occupy bank-0 BG IDs 200–207 with dark outlines and bright top edges. City silhouettes end above all platform tops. The original source PNGs and gallery exports remain available for comparison. LCD/LYC interrupts and independent column streaming run in `platformer.c`; actual per-scanline scroll values, tile/attribute wraps and frame timing are verified in PyBoy. Vertical rooms and tall props crossing a split need a revised layout.

The map appears after controls and before Alameda. Five stages form a visible path: Alameda, Campus, Plaza de la Dignidad, Río Mapocho, La Moneda. Its five PNG/C scene states show progressive unlocks with numbered open nodes, lock icons and muted dotted versus solid teal paths. Nodes, route segments, labels and progress rules are in `manifest.world_map`. The gallery can reject a locked-node selection and simulate rescues; this does not implement game progress or saves.

The finale includes eight larger 24-pixel cutscene figures in `native/ceremony-actors.png`. They are **background-composition sources**, with multiple colors, not three-color gameplay OBJ frames. Their production C data is baked into the three `ceremony_*_screen.*` exports. The kneeling president/Matapacos frame is a combined vignette. Students run to a fictional president, Matapacos receives a gold medal, and a 32 x 24 presidential standard with simplified central coat of arms rises. `presidential_standard.*` also exports the flag separately. The final state shows localized thanks and Fin/The End. Motion, timing and victory triggers remain for mechanics.

## Rebuild

The only art compiler dependency is `sharp`. No external API call occurs during a rebuild; it uses the retained source PNGs.

From the repository root, with Node.js and the declared dependency installed:

```powershell
npm run art:build
```

On this Codex desktop, the bundled dependency can be used without installation:

```powershell
$env:ART_SHARP_PATH = 'C:\Users\MQ10007341\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\sharp'
node tools/build-art.cjs
```

The compiler crops source atlas cells, normalizes sprite baselines, preserves small palette details during downsampling, quantizes colors, packs tile patterns, writes C arrays, and regenerates the previews and manifests. It fails if any validated scene exceeds its budget or if the exported tile data does not reproduce the native pixels.

## Integration and verification boundary

Generated headers expose tile counts and array sizes. Tile data uses Game Boy 2bpp row order, low bitplane byte followed by high bitplane byte. Palette arrays use `uint16_t` GBC BGR555 values. All exported arrays are `const` and intended to remain in ROM.

For implementation, load tile patterns, palettes, maps, and attribute maps through the appropriate GBDK APIs during scene initialization. Keep palette attribute writes distinct from tile-ID writes. Preserve the normal GBDK sprite layer and VBlank behavior. Use the provided frame and icon lookup tables; neither the sprite frame order nor the independently packed background tile IDs should be inferred from the PNG atlas alone.

Validation currently covers native palette membership, binary sprite alpha, bandana presence, nonempty frames, pattern/palette/OAM budgets, pixel-for-pixel 2bpp round trips, complete English/Spanish string pairs, supported localized glyphs, the language-first design contract, and retention of the checkpoint's three flag colors. Run and bark GIFs were decoded successfully during review. Native sheets, startup/controls screens, and composed scenes were visually inspected. The gallery's language gating is a screen-design demonstration; actual boot/input behavior still needs implementation and emulator testing.

The expanded validation also checks eight distinct native run poses, the optional 24-pixel ROM data, every scenic and map-state export, the ceremony, and all five mixed-bank background compositions. `tools/verify-art-review.cjs` uses local Playwright/Edge to exercise the full bilingual prototype, lock rejection, sequential unlocks, replays, three ceremony beats, size selection and facing. Results are saved in `review-validation.json`; this is browser validation, not ROM validation.

This art phase does not compile or run a game ROM. Input, physics, scrolling, collisions, enemy behavior, rescue logic, sound, and emulator/hardware verification belong to the mechanics phase.
