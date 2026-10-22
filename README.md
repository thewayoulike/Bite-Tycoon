# Business Simulator

A browser business-management game with a Unity 3D city and a shared React/TypeScript simulation and interface. **UnityComparison is the active Unity project** for Career and Sandbox. Its folder name is retained for asset and save compatibility.

Reviewed against the current source on **21 October 2026**.

## Play modes and saves

| Address | Purpose |
| --- | --- |
| `/` or `/?mode=fast-track` | Career: a new game starts with $250,000 of owner capital and no acquired businesses. Choose the first premises through the property market. |
| `/?mode=sandbox` | The same game with seven manageable properties, $1,000,000 of owner capital, and a one-time grant bringing each unlocked business to at least $250,000. Business levels, floors, room types, products and staff are available for testing. |
| `/?saves=1` | Continue, export, restart or restore a previous save. |
| `/?mode=career` | The older career save slot, using the current game. |
| `/?mode=sandbox&preview=1` | Temporary preview session with saving disabled. |

Sandbox still simulates stock, wages, bookings, leases and customer service. Renovations, facilities and upgrades remain purchases to try with testing funds. Mall tenant recruitment starts enabled in a new Sandbox. Existing trading history and chosen fit-outs survive a Sandbox upgrade.

Progress saves in this browser on this device every two seconds and on page exit. Modes have separate saves. Existing comparison saves take priority; matching older Unity/React progress is imported only when the main save is absent. Restarting a slot keeps a recovery backup. There is no offline income.

Keep the browser profile and site address consistent to access the same saves. Use **Export save** for a portable copy. The legacy `unity-game.html`, `unity-comparison.html` and `save-slots.html` pages redirect to the current game or save screen.

## Run locally

Install Node.js and npm, then run from the repository root:

```sh
npm ci
npm run dev
```

Open [Business Simulator](http://127.0.0.1:4189/). No API key is required. The published files in `public/unity-comparison/Build` provide the 3D world; the web development command does not compile Unity.

The workspace includes locally imported Unity assets and their source tools. Several licensed asset folders and generated files are excluded from Git. A fresh checkout needs those assets restored before rebuilding Unity.

## Build and publish locally

For React, TypeScript or CSS changes:

```sh
npm run lint
npm run build
```

`lint` runs TypeScript checking. `build` creates `dist/`, including the already-published Unity files. `npm run preview` serves that distribution and prints its address.

For Unity graphics, scene or C# changes:

1. Open **UnityComparison** in Unity **6000.6.6f1**, as recorded in `ProjectSettings/ProjectVersion.txt`, with Web Build Support installed.
2. Work on the existing `Assets/Scenes/BusinessSimulatorWeb.unity` scene. Run the appropriate editor checks and inspect the changed views.
3. Select **Business Simulator → Build Browser Game**. This builds WebGL into `UnityComparison/Builds/UnityComparison` and records the result in `artifacts/unity-comparison/web-build-result.json`.
4. After a successful Unity build, run:

```sh
npm run unity:publish
npm run build
```

`unity:publish` copies the successful WebGL output to `public/unity-comparison/Build`, updates its version and refreshes asset status. This publishes locally; it does not deploy to an external host.

**Do not run “Prepare Browser Game” for an ordinary update.** That command recreates scene content. Preserve the existing scene and imported art setup.

Unity Editor and browser development share this project. A separate Windows executable is not produced by the WebGL workflow.

## Current gameplay

- Career and Sandbox share the Forest & gold interface: compact status controls, an icon dock, matching map labels, weather menus and floor selectors. The Pantry and shared management windows use the same dark panels and controls. The HUD adapts to screen size and can be hidden from the view controls.
- Restaurants have independent menus, inventory, staff, tables, themed interiors and delivery/pickup services. Owned kitchens continue trading while you visit another property.
- Restaurant interiors are selected when buying, leasing or constructing a restaurant: Classic diner, Warm café, Contemporary bistro or Japanese minimal. Buyers can keep the existing fit-out or choose their own at move-in. Sandbox also offers a free, live style switcher in Staff & Shop. This replaces the obsolete Decor panel; cuisine and interior style are separate choices.
- Each style uses different chair and table shapes: chrome/vinyl diner sets, round café tables with bentwood chairs, glass-and-brass bistro tables with upholstered armchairs, and timber trestle sets with woven seats. Food stays on the correct tabletop when styles change.
- Supermarkets manage shelves, fresh/chilled goods, checkouts, purchasing, maintenance and an unlockable electronics/appliance floor.
- Hotels and apartments manage room/home types, rates, bookings or leases, housekeeping, maintenance and facilities. Career earns floor expansion; Sandbox exposes floors for testing.
- Willow Galleria occupies four city plots, with five floors supporting up to twenty shop units, tenant recruitment, rents, visitor facilities and tenant-specific interiors.
- Property listings distinguish vacant premises, operating businesses and buildable land. Actions and opening costs depend on the listing. Additional named shops and landmarks provide scenery until their management systems are implemented.
- Businesses share a calendar and keep separate accounts. Financial reports distinguish revenue, costs, loans, capital and depreciation. Departure records explain customer cancellations and walkouts with prevention advice.
- Weeks can last **3, 5 or 10 minutes at 1× speed**, selected between trading weeks. Longer weeks allow more service activity at the same movement pace. The 2× and 5× controls speed up both service and the calendar.

## Project map

| Location | Role |
| --- | --- |
| `UnityComparison/` | Active Unity project, scenes, imported art, shaders and C# presentation. |
| `src/unity/`, `src/unity-comparison/` | Unity integration, main entry, save handling and compatibility redirects. |
| `src/empire/`, `src/hooks/`, `src/career/` | Simulation, business systems, progression and saving. |
| `src/components/`, `src/graphics/` | Shared interface, view controls and city data. |
| Shared files in `src/prototype/`, `src/preview/`, `src/people-preview/` | Still-used business rules, financial reports, character catalogs and test support. Historical folder names do not make these files disposable. |
| `public/unity-comparison/` | Published WebGL files, asset status and current preview images. |
| `public/models/`, `public/previews/` | Model resources and current menu artwork. |
| `tools/`, `tests/` | Asset/build tools and regression checks. |
| `artifacts/` | Build results, validation evidence, original models and authoring tools. Some files are required inputs to the current asset pipeline. |
| `dist/` | Generated browser distribution. |

The retired **UnityPrototype** project, its old builds and the audited standalone prototype/design pages have been deleted. The [folder audit](docs/FOLDER_AUDIT.md) records the cleanup and retained shared resources.

## Development and verification

Follow the [interior layout instructions](docs/INTERIOR_LAYOUT.md) for furniture, room styles, indoor movement and cutaway views. Check actual model scale, orientation, circulation and seating, then inspect the browser result.

City regeneration uses `npm run unity:city`. The four-plot mall also relies on `ComparisonMallSite.Apply()` and `tools/prepare-comparison-mall.ts`; preserve its road cut, relocated scenery and perimeter routes. Run the editor city, traffic, room and mall checks that match the change.

Available web checks:

```sh
npm run lint
npm test
npm run build
```

Focused checks for promotion, saves, Sandbox and the Unity bridge:

```sh
npx tsx --test --test-concurrency=1 tests/gamePromotion.test.ts tests/unityComparison.test.ts tests/unityBridge.test.ts tests/sandboxUnlocks.test.ts
```

The latest cleanup verification passed these **25 targeted tests**, TypeScript checking and the browser build, and confirmed the current Unity files, characters and menu artwork were unchanged. Evidence is in `artifacts/folder-audit/`. Report full-suite results separately when that suite is run.


### Item visuals and street scale

Unity receives the identities of delivered restaurant dishes and stocked retail products. Tables show the served food, while grocery displays use recognizable produce and packaging and empty as shelf stock runs out. The shared item models also furnish food tenants and lodging refreshments. `src/unity/itemVisuals.ts` controls the rendering metadata; the simulation remains authoritative.

Supermarkets with an open electronics floor render an additional exterior storey. Ambient street pedestrians sample the visible pavement meshes instead of using a fixed height. Verification: `tests/unityItems.test.ts`, `tools/item-visual-fixtures.ts`, and `UnityComparison/Assets/Prototype/Editor/ItemVisualChecks.cs`.

### Supermarket stock work

Automatic unpacking and shelf refills process mixed-product loads and retain fractional work between updates, so additional available staff and 2×/5× speed do not lose capacity. Waiting shoppers and empty shelves take priority. The Operations panel shows the stock assistants and receiving clerks currently on duty; shifts, breaks, training and floor assignments still apply. Idle stock assistants rest instead of losing energy on nonexistent jobs. Stock movements preserve inventory value and do not create purchases or sales.

The scheduling logic is in `src/empire/supermarketLogistics.ts`, with regression coverage in `tests/supermarketLogistics.test.ts`. The stock-work update passed 91 focused supermarket, staffing, timing and bridge tests, TypeScript checking and the production build. A controlled two-assistant, 145-product small-delivery benchmark completed unpacking and shelving in 22.5 activity seconds, down from 108.75; evidence is in `artifacts/stock-logistics/benchmark.json`.
