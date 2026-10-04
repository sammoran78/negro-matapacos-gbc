# Negro Matapacos: Game Boy Color game plan

Status: **playable prototype implemented, 4 October 2026**. The current art now runs in a GBDK-2020 ROM. `platformer.c` implements the physics, collision, scrolling, sprint/bark, actors, collectibles, checkpoints, lives, rescue progression and frame loop. `ui.c` implements language selection, menus, the five-node map and localized ceremony captions. The authored five-stage route and medal/flag finale run in the emulator. See `README.md` for build, play and test commands.

The current gameplay pass uses the required 16 x 16/four-object dog and all eight running poses, three independently scrolling horizontal bands, fixed actor pools, 256 KiB of banked ROM and session progress. Physics use signed 12.4 positions, a 1.5 px/frame walk, 2.5 px/frame sprint, -4.5 px/frame jump, 0.25 px/frame² gravity and a 4 px/frame fall cap. These velocities stay below one 8-pixel tile per tick so destination-edge collision checks cannot skip a tile; every tile overlapped by the leading edge is checked. Background columns are precomputed in ROM. GBC double-speed CPU mode and grouped OAM reservation keep the tested route at one update per emulated frame.

Emulator verification covers both language flows, input-edge gates, collision boundaries, variable jump height, coyote time/buffering, sprint, bark/stun recovery and wall blocking, two-stomp police defeat and prizes, checkpoint retry, collectible persistence/extra life, map progression and SCX tile/attribute wrap in all three bands. Audio output is sampled, and a controller replay reproduces jumping past the closed barricade and rescuing from its right side. Full controller replays complete all five stages and the presidential-standard raising. Remaining production work includes vertical Campus rooms, music, difficulty tuning, battery saves and physical-hardware verification. Art sources and the optional 24-pixel comparison remain available for adjustments after playtesting.

First playtest changes: separate distant city silhouettes from jumpable bricks by ending the city at line 80 and using saturated brick colors with bright caps and dark outlines for all solid terrain. Mountains/sky move at camera/4, city at camera/2 and the playfield at camera speed. Bark still stuns; two descending stomps defeat an officer and release one empanada. A short square/noise woof accompanies each bark. The rescue trigger accepts a nearby bark from either side and any facing, including next to the students after jumping the barrier.

## Target and scope

Build a native Game Boy Color platformer with GBDK-2020, a 160 x 144 display, and a 16 x 16 dog assembled from four 8 x 8 hardware sprites. This project targets Game Boy Color; the repository name retains its original `gba` suffix.

The first deliverable is the art pack and native-size scene mockups. After the art phase, implement one complete, self-contained `platformer.c` containing the required movement, jumping, horizontal map, tile collision, scrolling, graphics, and frame loop. The later milestones grow it into a five-stage game with a Santiago world map and palace finale. Keep the first module independently buildable before splitting production systems into separate files.

Use the Game Boy SM83 target, explicit integer sizes, and ordinary C supported by GBDK/SDCC. Use `<gb/gb.h>`, `<gb/cgb.h>`, and `<stdint.h>`. Build a color-enabled `.gbc` ROM. The acceptance target is one simulation update per hardware frame, approximately 60 fps.

## Story and play loop

Negro Matapacos is a street-smart black dog with a bright red bandana. He crosses protest-filled Santiago, outwits patrolling Carabineros, collects empanadas, and opens escape routes for cornered students.

The repeated play loop is: explore a route, time jumps and barks, gather empanadas, reach the students, bark open their barricade, and cross the rescue trigger. A short student escape animation completes the stage. Barricades open only at designated rescue points, making the objective visually clear.

## Mandatory language selection and text policy

Every fresh boot must begin with an **English / Español** selector. The player must explicitly confirm a language before the **Start Game / Iniciar juego** option appears. Neither Start nor a held button may bypass this selection or automatically start a game with a default language. The selector may highlight a choice initially, but that highlight is not confirmation.

Startup flow: `LANGUAGE_SELECT -> TITLE_MENU -> CONTROLS -> WORLD_MAP -> PLAYING`. The Santiago map must appear before the first level. Read selection input on button edges and require a separate confirmation to activate Start Game and enter a stage. The title menu can also offer Language / Idioma to return to the selector.

Keep the chosen language in session state through stage changes, checkpoints, deaths, retries, pause, and new-game restarts. A fresh boot still presents the selector. Persistent preferences are not required for this first implementation.

All interface and dialogue text after confirmation must use the chosen language: menu options, instructions, HUD labels, speech bubbles, NPC dialogue, prompts, warnings, checkpoint/rescue messages, stage-clear text, game-over text, and the ending. Proper names such as Negro Matapacos and Alameda remain unchanged. Store text by stable string ID in English and Spanish ROM tables instead of scattering literal strings throughout mechanics code. Lay out and wrap each translation within the 160 x 144 screen and provide Spanish accented glyphs, ñ, and inverted punctuation. The full bilingual font is exported separately; load dialogue glyphs on demand or use another VRAM bank so the current gameplay tile budget is preserved.

**Text embedded in world artwork is always Spanish in both language modes.** Signs, posters, banners, murals, and other scenic lettering must never contain English translations. Keep that scenic lettering distinct from interface/dialogue overlays; interface text is rendered from the selected-language table. Current menu PNGs illustrate the Spanish interface and are not a substitute for the future runtime language setting.

The native art pack includes a language-selector design, Spanish UI previews, an expanded font, and `assets/localization.json` with paired English/Spanish interface strings. Runtime selection and speech-bubble rendering belong to the mechanics phase.

Proposed controls:

| Input | Action |
| --- | --- |
| D-pad Left / Right | Move and face that direction |
| A | Jump; releasing early shortens the jump |
| B | Bark in the facing direction |
| Double-tap Left / Right, then hold | Sprint; release or reverse to cancel |
| Start | Start the game or pause |

The initial module needs only Left, Right, and A. Add sprint and bark after collision and scrolling are stable. Treat simultaneous Left and Right as neutral input. Read `joypad()` once per frame and derive pressed/released edges.

## Milestone 1: complete platformer module

### Physics and state

- Store positions as signed 16-bit integers scaled by 16, giving 1/16-pixel precision. This supports the proposed 1,024-pixel-wide level without overflowing. Longer future stages must use room coordinates or a revised representation.
- Keep player position, velocity, facing, grounded state, input history, camera position, and frame counters in file-scope state. Use 8-bit counters and flags where their range allows.
- Proposed starting values: walk speed 1.5 pixels/frame, sprint speed 2.5 pixels/frame, jump velocity -4 pixels/frame, gravity 0.25 pixels/frame squared, and maximum falling speed 4 pixels/frame. These become named integer constants, scaled by 16, and are tuning values rather than final balance.
- Jump on the A press edge while grounded. Cut upward velocity when A is released. After the baseline works, add a 5-frame jump buffer and 5-frame coyote window so controls remain forgiving near ledges.
- Maintain world coordinates independently of camera coordinates. Clamp valid coordinates before indexing map arrays; handle negative movement explicitly rather than relying on shifting negative signed values.
- Start with the full 16 x 16 collision box to make the implementation easy to verify. Keep its dimensions and offsets named so later art can use a slightly inset box if playtesting warrants it.

### Map and scrolling

- Use a row-major `const uint8_t` map of 128 x 18 tiles: 1,024 x 144 pixels, or about six screen widths. The tile-ID map occupies 2,304 bytes in ROM.
- Use a small tile-property lookup table to distinguish empty, solid, hazard, and goal tiles. Keep collision meaning separate from palette choice.
- Include floors, raised platforms, a ceiling, a wall, stairs, and pits. These exercise each collision direction in a playable route.
- Track collectible state and opened barricades in small RAM flags or bitsets; retain the base map in ROM.
- Follow the player with a horizontal camera, clamped to the level endpoints. Keep the dog near the middle of the screen once scrolling begins.
- Treat the hardware's 32 x 32 background map as a rolling buffer. Load the visible area plus a margin at level start, then stream entering columns in either direction whenever the camera crosses a tile boundary. Stream palette attributes with tile IDs. Avoid copying the entire map every frame. GBDK provides submap APIs for larger source maps. [Background API](https://gbdk.org/docs/api/gb_8h.html)

### Collision algorithm

1. Resolve horizontal movement, then vertical movement, in world coordinates.
2. Convert accumulated motion into bounded one-pixel movement steps while retaining the fractional remainder. With capped speeds this provides predictable cost and prevents passing through thin walls.
3. For each step, query every tile touched by the advancing edge of the bounding box. A misaligned 16-pixel edge can overlap three tiles; checking just two corners is insufficient.
4. On collision, stop at the tile boundary, clear velocity and the blocked fractional motion for that axis, and stop its remaining steps. Set grounded only on downward contact; upward contact ends the jump.
5. Read collision information from the level data and runtime flags. Left/right map limits act as walls. The upper boundary is closed; falling below the lower boundary triggers respawn. Detect these cases before looking up a tile.

Proposed functions: `init_game()`, `read_input()`, `tile_properties_at()`, `move_player_x()`, `move_player_y()`, `update_player()`, `update_camera()`, `queue_visible_columns()`, `render_player()`, and `respawn_player()`.

### Rendering and frame timing

- Explicitly select `SPRITES_8x8` and reserve sprite IDs 0-3 for the dog. `SHOW_SPRITES` enables the sprite layer.
- Convert world position to signed screen coordinates, clip before narrowing to hardware coordinates, and then apply the hardware sprite offsets. Hide unused/offscreen sprites. Facing left requires both flipping the tiles and exchanging the left/right quadrants.
- Load graphics during initialization or scene transitions with the display safely disabled. Use GBDK graphics APIs for runtime updates.
- Each frame reads input, advances physics and state, prepares sprite positions and bounded tile updates, calls `wait_vbl_done()`, and commits pending scroll/map changes in the available graphics update budget. Verify that worst-case work finishes within one frame.
- Use the normal GBDK shadow OAM mechanism, which the default VBlank handler transfers to hardware OAM. [GBDK runtime behavior](https://gbdk.org/docs/api/docs_using_gbdk.html)
- Keep `wait_vbl_done()` as explicitly requested. Current GBDK documentation calls it obsolete in favor of the identically behaving `vsync()`, so this is a deliberate compatibility choice. [Frame synchronization API](https://gbdk.org/docs/api/gb_8h.html)

## Milestone 2: Alameda playable slice

Add the game's signature interactions to one complete stage:

- Sprint with acceleration and a short double-tap detection window.
- A directional bark hitbox extending approximately 24 pixels ahead, active for 8 frames, with a 30-frame cooldown. A bark stuns each eligible enemy at most once per activation, with a starting stun duration of 90 frames. Solid walls block its effect. Use a brief sprite effect and sound for feedback.
- A small fixed enemy pool. Carabineros patrol between markers, turn at walls and ledges, enter a timed stunned state, and recover. Cap active enemies near the camera. Each officer has two hit points: descending stomps damage and bounce the dog, including while the officer is stunned; a second stomp removes the officer with a dust effect and one empanada. Brief hit grace prevents counting the same contact twice. Bark stuns without consuming hit points. Defeat and prize-collection flags persist through deaths and revisits.
- Empanadas drawn with one 8 x 8 sprite each, with collection flags preventing repeat collection after scrolling or respawning. Every 50 grants an extra life. Defeated-officer prizes use a bounded five-item pool and the same counter/extra-life logic.
- Three starting lives, a checkpoint, brief invulnerability after contact damage, pit respawn, and a game-over/retry state. A life is lost only once per damage event. Collected items remain collected across checkpoint respawns.
- A rescue barricade, a group of students, and a stage-clear sequence. A bark within 40 pixels opens it from either side regardless of facing, so jumping past it cannot trap the player next to the students. Once opened, the barricade changes both its drawn tiles and collision state, including when streamed back into view or rescue starts immediately.
- A small bottom-window HUD for empanadas and lives. Reserve its screen space in level design so it never hides walkable ground or hazards.
- Distinct short sounds for jump, bark, pickup, damage, and rescue. Add stage music after the gameplay frame budget is measured.

Acceptance: English / Español selector -> localized title menu with Start Game / Iniciar juego -> controls -> Santiago map (only Alameda open) -> Alameda -> checkpoint -> barricade -> student rescue -> localized stage-clear screen -> map with Campus newly unlocked. Retry preserves the chosen language and restores a coherent stage state.

## Milestone 3: Santiago world map and five-stage progression

Show a rough north-up map of Santiago with city blocks, green parks, the Río Mapocho across its upper area, bridges, Alameda farther south, the university to the west, Plaza Baquedano to the east, and La Moneda near the center south of the river. This is schematic geography; the connecting game route may backtrack rather than imply a literal walking itinerary. The river requested as “Mapuche” is **Río Mapocho**.

Connect five numbered nodes with a visible path: **Alameda -> Campus -> Plaza de la Dignidad -> Río Mapocho -> La Moneda**. Initially only Alameda is selectable. Later nodes show lock icons and dotted muted paths; cleared connections become solid teal. Move a dog marker between selectable nodes, show the selected stage's localized name, and confirm with A. Keep proper place names; translate stage descriptions and prompts.

Keep an unlocked-stage count (1-5), a completion bitset, and the selected node in session state. Clearing stage i unlocks only i+1, once; failed runs and replaying cleared stages cannot relock or skip stages. Let the player revisit unlocked stages. After ordinary stage clear, return to the map and focus the next node. Preserve progress through deaths, checkpoints and retries; reset progress for a new game, retaining the chosen session language. Persistent cartridge saves remain a later feature.

| Stage | Visual identity | Gameplay and rescue objective | Engine addition |
| --- | --- | --- | --- |
| Alameda Avenue | Warm pavement, concrete, benches, murals, distant buildings | Teach movement, sprint, bark, and gaps; rescue students beyond a street barricade | Horizontal scrolling and basic patrols |
| University Campus | Brick, scaffold frames, library windows, rooftops | Climb to students trapped upstairs; encounter officers using authored ladder routes | Room transitions or vertical scrolling, ladder-aware enemies |
| Plaza Baquedano / Plaza de la Dignidad | Monument shapes, buses, mixed Chilean/red flags, dusk colors | Cross moving bus platforms, avoid tear gas and telegraphed water jets, rescue students near the monument | Moving-platform collision/carrying, timed hazards, staged guanaco obstacle |
| Río Mapocho | Engineered concrete/stone channel, steel truss bridges, overpasses, piers, muddy water, upper-bank city and parks | Run along authored dry service ledges, jump between bridge supports, climb a maintenance ladder, and rescue students at an exit ramp | Water/pit hazards, clearly marked solid ledges; decorative bridges remain non-colliding until explicitly authored |
| Palacio de La Moneda | Pale symmetrical neoclassical facade, central arched entrance, stone plaza, gardens, flagpole | Reach the palace forecourt, outwit the police, break the final rescue barricade and free all students | Final rescue trigger and ceremony state machine |

Introduce one mechanic in a safe area before combining it with existing ones. Build later stages with the same tile-property system, but implement dynamic platform collision separately from static map collision. The campus's vertical routes require explicit engine work beyond the initial horizontal module.

After the La Moneda rescue, the students run together to a waiting president. Show the president acknowledging them, kneeling to give Negro Matapacos a gold medal over his red bandana, then rising as the **Chilean presidential standard** is raised. The standard is the national flag with the coat of arms in its center, distinct from the small national checkpoint flag. Finish with localized thanks, “The End / Fin”, and optional credits. Use a timeless fictional president with a tricolor sash rather than a likeness tied to the current officeholder.

Proposed sequence: `FINAL_RESCUE -> STUDENTS_RUN -> MEDAL_AWARD -> FLAG_RAISE -> ENDING`. Complete the rescue before triggering the ceremony, disable hazards/control during it, retain language, and make skips advance to the completed ceremony without losing victory state. Student run poses, medal figures and three ending tableaux are designed; their timed animation belongs to mechanics. Defer the optional activist shop, persistent saves, and a larger inventory until the five-stage route is complete.

## Pixel art and startup screen

### Player and gameplay art

Use a readable side-on dog silhouette with pointed muzzle, visible tail, and a red bandana. Each 16 x 16 pose remains exactly four 8 x 8 sprites. The revised sheet fills up to 15 pixels of each cell with feet on a shared baseline. It has 2 idle frames, **8 run frames**, 1 rising frame, 1 falling frame, 2 bark frames, 1 hurt frame, and 1 celebration frame: 16 poses, 64 tiles before reuse. Interleave the four new run poses with the original contact/passing/airborne/recoil poses at approximately 80 ms per pose. Select run cadence from movement speed later.

The gallery also provides a **24 x 24 alternative** for comparing leg/muzzle detail at native resolution. This costs nine 8 x 8 sprites per pose and needs a revised collision box, camera composition, active-actor cap and scanline audit. Its separate ROM export contains nine tiles per pose; loading only the active frame into nine reserved slots avoids keeping all 144 tiles resident. The required first module continues to use 16 x 16 until this alternative is chosen. Scaling a preview alone cannot add detail to a 16-pixel hardware sprite.

### Scenic depth and 2.5D presentation

Use the user's supplied Santiago panoramas as references for snow-covered Andes, layered city blocks, trees and clear sky. Each of the five stages now has its own 160 x 96 native scenic image and separate sky, Andes and city strips, plus a layered 160 x 144 gameplay study. Alameda uses warm street facades; Campus uses brick/library roofs; Plaza uses lavender dusk and the monument; Mapocho uses retaining walls and bridge spans; La Moneda uses the ivory palace frontage.

The GBC has one scrolling background plane and a window layer, not arbitrary transparent background planes. Compose scenery and overlapping platforms into that plane, behind the sprite actors; collision continues to read the foreground map only. Store gameplay patterns in VRAM bank 0 (up to 128 background patterns and 128 sprite patterns in the default GBDK layout). Load either the clean scenic library or its platform-composite variant in bank 1, not both together. Exported scenic attributes set tile-data bank bit 3, while palette bits 0-2 share the stage's same eight background palettes. The HUD uses the window.

The runtime uses LCD/LYC updates for three horizontal bands: sky/Andes at camera/4 on lines 0–47, city at camera/2 on lines 48–79, and terrain at full camera speed from line 80. VBlank latches all three scroll values together. LCD interrupts on lines 47 and 79 wait for HBlank before changing SCX for the following line. Each band maintains its own entering tile/attribute columns and 32-column wrap buffer. All solid terrain and decorative world props stay in the full-speed band; sprite positions use the full camera. Foreground structures crossing a split require a revised layout. Campus vertical rooms need authored variants. The gallery keeps its earlier visual study; runtime captures and scanline tests now verify the implemented effect in PyBoy.

Runtime scenic strips use six palettes with a slight atmospheric tint. Palette 6 is reserved for high-contrast solid terrain and palette 7 for text/HUD. The city image stops at line 80, above all authored platform tops. Independent streaming, line splits, tile/attribute agreement across wraps and the complete route's frame budget are checked in PyBoy. [GBDK background/attribute APIs](https://gbdk.org/docs/api/gb_8h.html)

The implemented runtime puts scenery in **VRAM bank 1** and the full 54-glyph font in **VRAM bank 0**, BG tile IDs 128–181. That shared pattern region stays clear of the common OBJ IDs 0–116. Additional student-run OBJ tiles use 184–199, saturated foreground BG patterns use 200–207, barricade BG patterns use 208–215, and the moving bus OBJ patterns use 224–227. Stage BG tiles 0–127 use GBDK's default signed addressing region, which does not overlap OBJ 0–127. Menu art loads into VRAM bank 1 so localized bank-0 font overlays preserve its patterns. The finale reserves bank-1 BG IDs 224–235 for the moving standard; its base library remains below 224. Keep these explicit reservations when adding art.

Use one sprite palette with transparent index 0, near-black fur, a light gray highlight, and red. The highlight keeps the dog readable on dark scenery. Backgrounds should avoid placing similarly dark silhouettes directly behind him. GBC sprite palettes have four entries, with sprite index 0 transparent; background tiles can use all four entries of their selected palette. [GBC palettes](https://gbdk.org/docs/api/cgb_8h.html) [Hardware capabilities](https://gbdk.org/docs/api/docs_supported_consoles.html)

Mix red protest flags with recognizable Chilean flags: a red lower half, white upper half, and a blue upper hoist canton with one white star. The title's two large foreground flags and the checkpoint flag use this Chilean design; smaller red protest flags remain. Keep Matapacos's bandana red. Any lettering added to flags or other artwork must be Spanish.

Create a compact shared tileset for pavement, platforms, wall edges, benches, barricades, empanadas, and HUD glyphs. Keep the base gameplay libraries below 128 BG patterns and 128 OBJ patterns; additional patterns in the shared region must follow the reservations above. Allocate fixed sprite ranges for the dog, active enemies, and effects; use backgrounds for crowds and large vehicle bodies. The runtime reserves complete 16-pixel poses together and gives the dog priority, with a 40-object total and conservative 10-object-per-scanline cap. The controller replay checks actual hardware OAM occupancy as well as the budget counter. [Hardware capabilities](https://gbdk.org/docs/api/docs_supported_consoles.html)

### Startup screen art brief

- Canvas: native 160 x 144 pixels, aligned to an 8 x 8 tile grid.
- Upper region: a large, legible two-line title, `NEGRO` / `MATAPACOS`, using custom pixel lettering.
- Center/lower region: a larger portrait of the dog, turned slightly toward the street, with the red bandana as the focal color.
- Background: Santiago skyline silhouettes, protest banners, and warm evening light, with enough empty space to preserve title contrast.
- First boot screen: English / Español selector, with no Start Game option before confirmation.
- After selection: the portrait/title menu shows localized `START GAME` / `INICIAR JUEGO`; controls and subsequent prompts use the chosen language.
- Footer artwork contains no baked English interface text; localized text is a separate overlay.
- Motion: a small bandana flutter or ear movement; keep the main composition static.
- Build the portrait from background tiles so it does not consume a large sprite pool. Budget at most 256 unique background patterns for this separate scene, reusing skyline and lettering tiles. Load the gameplay tileset on the transition into the stage.

Author an indexed pixel-art source, then convert it into tile patterns, a tile map, and CGB palette attributes with GBDK's asset tools. Validate palette and unique-tile budgets on the converted data; a scaled illustration alone is not a ROM-ready asset. [GBDK asset toolchain](https://gbdk.org/docs/api/docs_toolchain.html)

## Optimization and verification

Use `const` for immutable graphics/maps, fixed pools for actors, compact state machines, and frame counters for timing. Avoid floating point, dynamic allocation, recursion, formatted output, and large stack buffers. Inspect compiler output and memory reports before applying assembly-level optimizations. These choices follow GBDK's embedded-C guidance. [Coding guidelines](https://gbdk.org/docs/api/docs_coding_guidelines.html)

Build with GBDK `lcc`, retain compiler/linker reports, and verify in a GBC-capable emulator such as Emulicious or BGB. Record the actual toolchain version and working build command in the README during implementation. Hardware verification can follow if a device is available.

Required checks:

- Compile and link with the correct GBC header and no unexplained warnings.
- Boot into the English / Español selector; verify Start Game is absent until an explicit choice is confirmed and held buttons cannot skip either screen.
- Complete the title, controls, HUD, dialogue, pause, checkpoint, rescue, game-over, and ending flows in both languages; check wrapping, accents, inverted punctuation, and missing string IDs.
- Preserve the selected language through deaths, retries, new-game restarts, and stage changes; confirm scenic artwork lettering stays Spanish in both modes.
- Show the map before Alameda; verify all locked nodes reject entry, each rescue unlocks exactly one next node, replays preserve progress, and new game resets it.
- Complete all five stages and the palace rescue -> student run -> medal -> presidential standard -> localized ending sequence.
- Check scenic bank/palette attributes, band boundaries, foreground collision alignment, wrap seams, static HUD and worst-case LCD/VBlank timing.
- Confirm all four dog sprites align and flip correctly; offscreen coordinates do not wrap into view.
- Test floor landing, wall contact from both sides, ceiling bumps, platform corners, ledges, sprinting into walls, and maximum-speed falls.
- Walk off a ledge without jumping; holding A must not repeatedly trigger jumps.
- Scroll both directions across the 256-pixel hardware-map wrap point and each level endpoint; graphics, attributes, and collision must agree.
- Exercise death, checkpoint restart, pause, stage transition, and a full new-game restart.
- Check that collectibles cannot be collected again after scrolling or checkpoint respawn, and that each 50-item threshold grants exactly one life.
- Test simultaneous bark targets, cooldowns, stun recovery, walls blocking bark, and opening/revisiting the rescue barricade.
- Measure worst-case frame time and sprite overlap with the maximum intended active enemies and effects. Frame synchronization alone does not guarantee the game meets its frame budget.

## Delivery order

1. Player and actor sprite sheets, stage tilesets, startup and UI screens, native-size mockups, converted assets, and verified art budgets. The first pass is now in `assets/`.
2. `platformer.c`: complete minimal platformer using the designed art, map, collision, camera, respawn, and requested VBlank loop; reproducible build instructions and compiled ROM when the local toolchain is available.
3. Alameda slice: sprint, bark, police patrols, empanadas, HUD, checkpoint, sound effects, and student rescue.
4. World map and sequential unlocks; Campus, Plaza, Mapocho and La Moneda content, including the palace ceremony.
5. Balance, music, complete-game testing, and release packaging.

The plan assumes local development. Any step that would introduce new charges requires approval before it is taken, in line with the user's standing preference.
