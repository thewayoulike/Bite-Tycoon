# Interior layout rules

Use these rules when changing furniture, rooms, indoor character positions or cutaway interiors in Business Simulator. The active game is `UnityComparison`; Career and Sandbox share its renderer. Keep simulation, ownership, rent and bookings independent from visual decoration.

## Measure imported models before placing them

- Inspect rendered mesh bounds in a common local coordinate system. Do not assume the prefab's X axis is its width, or that its pivot sits on the floor. Exclude hidden meshes from placement checks.
- Normalize furniture in a child transform; keep the outer placement root at unit scale so attached people and interaction targets are not stretched.
- Room convention: X is furniture width, Y is up, Z is depth. Identify the actual front from the seat/backrest, pillows/headboard or doors, then rotate the asset deliberately.
- Known pack exceptions: `ApartmentBed` runs lengthwise along X. Rotate it +90 degrees before fitting it to a 2.25 m length. The imported `loungeSofa` runs along Z; orient its seating width along X before placing it in a room.
- Adult beds must stay about 2.1–2.3 m long regardless of width. Current targets: single/twin 1.12 m, double 1.65 m, king 1.95 m. Small room categories need narrower beds, not shorter adults.
- Keep pillows, cups, lamps and handles proportional. A coffee cup is about 0.11 m wide. Check furniture against the actual 1.6–1.9 m character models.

## Plan a usable room

Work from room dimensions and doors, not from a screenshot alone. Establish sleeping, working, sitting, storage and bathroom zones. Keep a continuous route from the entrance to the bed, desk, wardrobe and bathroom. Aim for 0.75–0.9 m primary walkways and at least 0.6 m access to the usable side of a bed; compact furniture gaps can be smaller where people do not walk.

- Face sofas and armchairs toward their coffee table or focal point. Place coffee tables in front of the seats with roughly 0.35–0.5 m clearance. They must not pass under a sofa or through its armrest.
- Put desk chairs on the working side of a desk with room to pull them out. A chair deliberately tucked under a table is a documented exception to footprint checks, not a reason to ignore all intersections.
- Keep beds, sofas, desks, cabinets and partitions from intersecting. Rugs may extend under furniture; wall art and headboards may touch their supporting wall.
- Leave bedroom-divider openings, bathroom access and wardrobe doors usable. Do not put a sofa across the only route to a second room.
- Start furniture on the room's actual floor surface. Align sleeping and seated actors to the resulting mattress/seat, including floor elevation. Validate upper floors as well as the ground floor.
- For apartments, coordinate kitchen, dining, bedrooms and lounge together. Avoid layering two decorators that both add a rug, lamp, sofa or bedside cabinet to the same location.

## Make categories visibly different

Use furniture and layout differences as well as colour. Current hotel intent:

| Category | Visible arrangement |
| --- | --- |
| Standard | Single bed, compact writing desk and one chair; simple finishes |
| Double | Double bed, two bedside lamps and compact lounge seating |
| Family | Two full-length beds, shared bedside table, activity table and family storage |
| Business | Double bed, generous desk, laptop, work chair and refreshments |
| Premium | King bed, upholstered headboard, upgraded artwork, lounge and minibar |
| Suite | King bed, bedroom divider with clear access, separate lounge, coffee table and refreshments |

Studio, one-bedroom, two-bedroom and penthouse apartments should also read as different layouts. Preserve the actual selected room type; don't show a luxury layout in a Standard room or overwrite saved renovations for a demonstration.

## Verify before publishing

1. Check full rendered furniture footprints, not only pivot positions. Test bed dimensions and sofa width/depth orientation. Check sofa–table and other major furniture intersections; allow only intentional contact documented above.
2. Inspect every changed category in Unity at a useful close view and an overview. Include family/two-bedroom arrangements, luxury partitions, occupied rooms, and the highest affected floor. A passing compilation or bounds test does not prove that a layout looks right.
3. Verify a room-type change rebuilds the fit-out, while day/night and dirty/occupied states retain the right room identity. Check the actual browser build after publishing when the change targets WebGL.
4. Preserve player saves. Use isolated test fixtures/saves for automated checks. Don't turn test room upgrades or camera fixtures into the user's saved state.

Current implementation: `UnityComparison/Assets/Prototype/Scripts/BusinessRoomDesigns.cs`, room assembly in `BusinessGameBridge.cs`, apartment extras in `BusinessVenueDetail.cs`. Native checks live in `UnityComparison/Assets/Prototype/Editor/RoomDesignChecks.cs`. Run `RoomDesignChecks.Run()` in the active Unity editor, then inspect camera captures from `RoomDesignChecks.Show()` / `Focus()`.

## Movement, shop identity and uniforms

- Resident activity points must come from the actual furniture bounds. Route around beds, partitions, storage and coffee tables. Repeated simulation frames must not reset a resident's position. Check awake, seated, going to bed, sleeping and getting up, as well as pause and speed controls.
- Sleeping people face upward with their heads at the pillows. Use a draped cover above the body, hide shoes while sleeping, and check that custom mesh coordinates are finite. Clamp trigonometric rounding errors before square roots.
- Mall shop entrances face the central aisle. Keep the door gap and browse route clear; fit occupied units to their actual lease type, and do not add customers to vacant units. Decorative customer movement must not generate extra sales or rent.
- Electronics demonstration models remain visible when stock runs out. Their labels must use the matching product's stock and distinguish display-only units from sale stock.
- Restaurant themes share the same service and seat anchors. Check diner, cafe, bistro and Japanese styles with seated customers and live staff. Do not put theme decoration over a service route.
- Waiters use white shirts and dark service aprons; chefs have white jackets, dark trousers, white aprons and fitted chef hats. Customers wear varied everyday outfits. Preserve model rigs, faces and body coverage when changing clothing materials, and attach accessories to the animated skeleton.
- Use `InteriorActivityChecks` for occupied native fixtures. Restart Play after changing scripts before final visual inspection; stale objects left by script reload are not representative of a fresh browser load.

Related implementation: `BusinessRoomResident.cs`, `BusinessApartmentCharacter.cs`, `BusinessTenantInteriors.cs`, `BusinessElectronicsInterior.cs`, `BusinessRestaurantCharacter.cs`, `BusinessOutfit.cs` and `tools/style-unity-cast.py`.

Treat these dimensions as this game's design targets, not a claim of building-code compliance. If a different imported model or room footprint needs another arrangement, measure and verify that arrangement rather than copying offsets blindly.
