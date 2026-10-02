# Quaternius city preview assets

These data assets are isolated to `/city-model-preview.html`. The main game does not import them.

- Creator: **Quaternius**
- Pack: **Downtown City MegaKit**, free Standard edition
- Official page: https://quaternius.com/packs/downtowncitymegakit.html
- License: **CC0 1.0 Universal**, retained in `QUATERNIUS_LICENSE.txt`
- Downloaded from a CC0 redistribution after the official 223 MB browser download stalled:
  https://github.com/AetherRadar/operation-steel-tide/tree/c62744623058dd2c1dab804efdcfa6816dc56b72/assets/models/quaternius_downtown_city
- That distributor records the geometry/textures as unmodified copies of the free Standard pack; its provenance is retained in `UPSTREAM_README.md`.
- `manifest.json` records the pinned revision and SHA-256 of each downloaded file. Each file was also checked against its Git blob hash and size at download.

The preview uses original glTF geometry, binary buffers and texture images. Local display materials add facade colours, reflection settings and simple window emission. It does **not** include the paid Source edition's engine shaders. Trees, cars, garden furniture, signs and lighting are local preview dressing, not additional Quaternius assets.

This is an exterior visual study only. It does not change the game's simulation, interiors, saves, cash, property data or management screens.
