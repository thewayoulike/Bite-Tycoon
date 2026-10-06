# UI and 3D audit — September 14, 2026

Update, October 5, 2026: the career game saves in this browser, with a visible save status. The weekly report, property panel, table layout, and planning desk keep keyboard focus inside the dialog. Order tickets use dish illustrations. Staff routes already walk around tables. The frame-rate numbers below are from September 14 and were not re-measured.

Scope: source review of the scene, character rig, furniture, effects, main UI, all seven management panels and daily summary. Live checks covered onboarding, the restaurant, all seven management panels and a 390 × 844 viewport. This is a visual/usability audit, not a complete economic simulation or performance certification.

## Implemented

| Area | Finding and change |
| --- | --- |
| Customers | Hair volume covered facial features. Added a separate customer head with a defined hairline, six sculpted styles, blinking eyes, rounded jaw, glasses and earrings. |
| Variety | Hair and clothing shared the same seed modulus. Independent deterministic choices now vary skin, hair, eyes, clothing style and outfit palette. |
| Clothing | Added a softer torso silhouette and details for previously plain outfit variants. |
| Seated pose | Legs remained at standing hip height while the torso lowered. Both now lower by the same amount. |
| Lighting | Enabled soft shadows, bounded shadow coverage, warm pendant illumination, hemisphere fill and tone mapping. |
| Materials | Added locally generated wood grain, rug detailing and rounded plant leaves. |
| Camera | Added Reset view and a default cutaway that hides the front facade, door, sign and ceiling beams. Full-room mode remains available. |
| Readability | Replaced the tiny pixel typeface in gameplay with the existing sans-serif family, enlarged the smallest labels, softened panel borders and retained pixel branding on the title screen. |
| Navigation | Fixed duplicate Decor wording, simplified Pantry, retained mobile button labels and added accessible navigation names and selected states. |
| Orders | Replaced wrapping tickets with a horizontal scrollable queue to limit obstruction of the scene. |
| Keyboard | Added visible focus rings, Escape to close management panels and descriptive price-change button names. |
| Onboarding | Removed instructions naming dishes that are not the actual starter menu. |
| Recipe menu | Defaults to active dishes instead of displaying all 116 recipes. All and Locked filters remain available. |
| Small screens | Enabled scrolling in onboarding and day-summary cards and wrapping of header status controls. |
| Neighborhood | Added 18 shop buildings with detailed facades, tiled sidewalks, benches, planters and 20 animated pedestrians, plus a neighborhood camera preset. |
| Trees and cars | Replaced simple silhouettes with layered, rounded tree crowns and rounded vehicle bodies, glazing, trim, lights and turning wheels. Outdoor animation now follows game speed and pause. |
| Rendering | Removed refractive glass passes and redundant decorative point lights. Instanced repeated street details and pedestrian body parts; the crowd uses two mesh draws per render pass. Switched to supported PCF shadows to stop repeated deprecation warnings. |
| Graphics options | Added Detailed and Fast settings. Fast disables real-time shadows and caps pixel ratio at 1 while retaining scene models. |
| Floor reliability | Rebuilds the initial floor material when its generated texture arrives, preventing an untextured white floor. |

## Recommended next work, in priority order

1. **Modal accessibility:** use a shared dialog with focus trapping/restoration, dialog semantics, and consistent input labels. Decor color fields currently lack useful accessible names; nested research/day-summary overlays need coordinated keyboard handling.
2. **Rendering performance:** profile full occupancy on an actual lower-powered device. The wide neighborhood remains draw-call heavy; batch more static geometry and add distance-based detail for cars/buildings. The production bundle still produces Vite's large-chunk warning (roughly 1.64 MB uncompressed); code splitting is a separate loading-time improvement.
3. **Character movement:** customer routes follow a central aisle rather than avoiding every chair and guest. Add obstacle-aware movement and validate every seating transition. Walking uses frame time while simulation speed is separate; unify their timing deliberately.
4. **Scene readability:** fixed cutaway hides only the front wall. Camera-dependent wall hiding, adaptive label visibility and named table markers would help when rotating or zooming far out. Very narrow screens crop much of the restaurant horizontally.
5. **Management density:** pantry/research ingredient grids and financial reports remain dense. Add a compact summary followed by expandable details, contextual ingredient labels and a single clear scroll region per panel.
6. **Food identity:** served food uses generic shapes and tickets use emoji. Create consistent dish-specific meshes/icons so the meal matches the order and is recognizable across platforms.
7. **Progress continuity:** game state lives in React memory; reloads restart the session. Add versioned saves and a visible save indicator before treating the game as a persistent tycoon experience.
8. **Motion preferences:** CSS animation honors reduced motion; procedural 3D movement still needs a dedicated reduced-motion option.

## Verification limits

TypeScript and production build checks are run for this patch. Live inspection confirms the updated UI, restaurant, neighborhood, trees and cars render, and both graphics settings work. The day-summary overflow fix is source-verified; a complete day, every recipe, every outfit combination, all decor variants and maximum occupancy have not been exhaustively play-tested.

## Performance observations

Temporary five-second frame counters and Three.js renderer statistics were sampled in the local development preview, then removed from the application. These are local observations, not a device-independent benchmark.

- The original sampled busy scene had 39 lights and 15 transmissive objects, around 2,700–2,800 draws and 18–19 FPS. Camera framing and occupancy differed from later samples, so this is not a controlled before/after comparison.
- The updated empty restaurant view sampled about 39–44 FPS. At night the cutaway scene has 13 lights and no transmissive materials.
- At the same empty neighborhood camera preset, replacing individual pedestrians with two instanced meshes reduced draws by roughly 270, with cars moving through view during measurement. Samples rose from around 23–27 to 27–29 FPS.
- A subsequent graphics-mode comparison at the same neighborhood camera and empty restaurant sampled 26–30 FPS in Detailed mode and 32–37 FPS in Fast mode, at pixel ratio 1. Moving traffic and system load still cause variation.
- Remaining costs include many separately drawn building/car details and additional characters at full occupancy. Smooth 60 FPS is not yet established for the wide city view.
