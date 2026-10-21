# Project folder audit — 21 October 2026

**Status: completed with user approval. All 321 listed files were deleted, and the browser distribution was rebuilt. Total reduction: 112.5 MB.**

The earlier cleanup removed `UnityPrototype`, `public/unity-game`, `dist/unity-game` and the obsolete Unity publisher. This audit found older React experiments, menu concepts and review screenshots that were outside that first cleanup.

## The file you noticed

`artifacts/business-simulator-start.png` is a 48.9 KB historical screenshot. It was not loaded by the current game and has now been deleted. The current start screen uses **`public/previews/main-street-menu-v1.png`**, which must stay.

## Completed cleanup

321 files, totaling 81.8 MB, are listed in the [exact removal manifest](../artifacts/folder-audit/cleanup-manifest.json). The rebuilt browser distribution is 30.6 MB smaller after removing obsolete preview assets and page bundles.

| Category | Files |
| --- | ---: |
| Historical React screenshot or standalone review fixture | 229 |
| Retired proposal report output or generator | 5 |
| Retired standalone preview page | 12 |
| Unused published review screenshot | 7 |
| Retired design comparison page | 3 |
| Retired login concepts; selected image is retained separately in public/previews | 26 |
| Unused former menu/concept image | 2 |
| Used only by retired preview pages; absent from game, tools and test dependency graphs | 36 |
| Unused former Unity save screen; main save screen and migration remain | 1 |

The twelve removed standalone pages were:

- `building-model-preview.html`
- `cast-preview.html`
- `character-preview.html`
- `city-game-prototype.html`
- `city-model-preview.html`
- `cozy-prototype.html`
- `expansion.html`
- `game-proposal.html`
- `graphics-prototype.html`
- `property-preview.html`
- `restaurant-playtest.html`
- `street-assets-preview.html`

Their isolated source files were checked against the imports of the main game, both URL redirects, tests and tools. Python tools that read TypeScript catalogs directly were also considered. The old `UnitySaves.tsx` screen has no incoming imports; the active save screen and migration code remain.

## Files that must stay

| Location | Why it remains |
| --- | --- |
| `UnityComparison/` | The active Unity project, including its `Assets/Prototype` folder. The word Prototype in that folder name does not mean it is retired. |
| `src/unity/`, `src/unity-comparison/` | Current renderer, game bridge, save migration and legacy URL redirects. |
| Shared modules in `src/prototype/`, `src/preview/` | Property rules, business interiors, management controls and financial reports still imported by the main game. |
| `src/components/GameWorld3D.tsx` | Also supplies the current Unity game’s shared HUD and view controls. |
| Catalogs in `src/people-preview/`, `src/building-preview/` | Used by the current cast, model tools and regression tests. |
| `public/models/` | Runtime characters and original model resources used by tools and tests. These were not marked for bulk deletion. |
| `public/previews/main-street-menu-v1.png` | Current main-menu artwork, confirmed by its CSS reference. |
| `public/coffee-shop-preview.html`, `public/unity-free-assets.html` | Still linked from the current asset gallery/save page. |
| `artifacts/outfit-source/`, `artifacts/people-source/`, model/tool build folders | Original models, Blender tools, licensing/source information and inputs needed to regenerate assets. |
| `artifacts/unity-setup/fixtures`, `shared-city`, `free-assets` | Inputs still used by current Unity checks and art tools. |
| `artifacts/unity-comparison/` | Current build result, validation evidence and test fixtures. |
| Browser saves | Not part of this filesystem cleanup; no save storage was read or changed. |

## Larger folders reviewed

These pre-cleanup sizes exclude `.git` and `node_modules`. Symbolic links were not followed; none were found in the inventoried tree.

| Folder | Size |
| --- | ---: |
| `UnityComparison/Library` | 4.82 GB |
| `UnityComparison/Assets` | 2.92 GB |
| `artifacts/unity-setup` | 2.64 GB |
| `artifacts/cast-build` | 2.34 GB |
| `artifacts/tools` | 1.34 GB |
| `artifacts/people-source` | 1.20 GB |
| `dist/models` | 0.53 GB |
| `public/models` | 0.53 GB |
| `artifacts/outfit-source` | 0.21 GB |
| `dist/unity-comparison` | 0.14 GB |
| `public/unity-comparison` | 0.14 GB |
| `UnityComparison/Builds` | 0.12 GB |

The active Unity Library is an import cache, not a second game. `dist/` is the reproducible browser distribution; copies there are expected. The large Blender and original-model folders were retained because an old filename alone does not prove that an asset is unused.

## Supporting changes completed

1. Remove the retired page entries from `vite.config.ts` and rebuild `dist/` so they are no longer distributed.
2. Remove the obsolete proposal-report link in `CareerDesk.tsx` when deleting its report.
3. Update the old prototype references in README and the generated-artifact exclusions in TypeScript configuration.
4. Keep the three compatibility entry pages for existing Unity and saved-game bookmarks.
5. Run type checking, the existing game-promotion and save tests, and a production build. Verify the game routes and active assets afterward.

The browser build now contains only the main game and three compatibility entry pages. The obsolete proposal-report link was removed, README was corrected, and generated artifacts are excluded from TypeScript checking. Type checking, all 25 compatibility tests and the production build passed; seven live routes returned HTTP 200. The build still reports its existing large-JavaScript-chunk advisory.

## Audit evidence and limits

- [Read-only audit tool](../tools/audit-project-files.mjs)
- [Full file inventory](../artifacts/folder-audit/inventory.json)
- [Exact cleanup manifest and preserved asset hashes](../artifacts/folder-audit/cleanup-manifest.json)
- All 321 approved files are absent, including their public copies in the rebuilt distribution. The 107 protected current-build, character and menu files match their recorded SHA-256 hashes; their rebuilt distribution copies match too.
- Static import checking does not prove that every dynamically addressed asset is unused. For that reason, original model libraries and Unity project contents were retained.
- Bulk deletion was initially deferred during the audit. The user then explicitly approved the removal list, and the cleanup was completed. Browser saves and the active Unity project were not modified.
