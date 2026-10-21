Bite Tycoon - approved residential house

The selected Cedar House kit and its stone, siding, timber and roof textures
were generated locally by tools/build-original-buildings.py using Blender.
No Sketchfab or Poly Haven building geometry is included in these files.

house.glb is a reusable kit, not a flattened assembled building:
  ground: ground-floor shell and furnishings
  level: repeatable upper-floor shell and furnishings
  roof: matching rooftop
All three modules are exported at the origin. The prototype places upper floors
at multiples of floorHeight and the roof at floorHeight * totalFloors.
Dimensions are in manifest.json. Units are metres, Y up. It has G + 1 upper floor.

Custom extras identify each module and each section. Front and right sections
are hidden in cutaway mode. Interiors are hidden in the exterior overview.
The exterior and cutaway use the same geometry and footprint.

Editable Blender source:
  artifacts/building-build/original-neighborhood-buildings.blend
Generator:
  tools/build-original-buildings.py
Preview:
  /building-model-preview.html

The exterior is installed in the main game's residential scenery. It is batched
by material and instanced across the paired residential plots, with night lighting
and snow on upward-facing surfaces. Existing businesses and operating rules remain.
The preview's furnished cutaways are visual concepts, not a new managed business.
The other four building proposals have been removed from the public models and UI.
