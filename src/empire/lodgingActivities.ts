import { clearWalkingSegment, FloorPoint, Furnishing, InteriorRoom, LodgingLayout, lodgingWalkingPath, PERSON_CLEARANCE } from './lodgingLayout';

export interface LodgingActivity {
  pose: 'sit' | 'sleep';
  furnitureId: string;
  approach: FloorPoint;
  position: [number, number, number];
  heading: number;
  seatHeight: number;
}
const cache = new WeakMap<LodgingLayout, Map<string, LodgingActivity | null>>();
function localPoint(item: Furnishing, x: number, z: number): FloorPoint {
  return { x: item.x + x * Math.cos(item.yaw) + z * Math.sin(item.yaw), z: item.z - x * Math.sin(item.yaw) + z * Math.cos(item.yaw) };
}

export function residentKitchenPoint(layout:LodgingLayout,room:InteriorRoom):FloorPoint{
 const kitchen=layout.items.filter(i=>i.kind==='kitchen').sort((a,b)=>Math.hypot(a.x-room.center.x,a.z-room.center.z)-Math.hypot(b.x-room.center.x,b.z-room.center.z))[0];
 if(kitchen){const point=localPoint(kitchen,0,kitchen.d/2+PERSON_CLEARANCE+.18);if(lodgingWalkingPath(layout,room.destination,point).length>1)return point;}
 return room.destination;
}

/** Walk only to clear floor beside furniture. Sitting/climbing is a separate motion. */
export function lodgingActivity(layout: LodgingLayout, room: InteriorRoom, night: boolean): LodgingActivity | null {
  let saved = cache.get(layout);
  if (!saved) { saved = new Map(); cache.set(layout, saved); }
  const key = `${room.index}:${night}`;
  if (saved.has(key)) return saved.get(key)!;
  const items = layout.items.filter(item => {
    if (!(night ? item.kind === 'bed' : item.kind === 'sofa' || item.kind === 'chair')) return false;
    const nearest = layout.rooms.reduce((best, candidate) => Math.hypot(item.x - candidate.center.x, item.z - candidate.center.z) < Math.hypot(item.x - best.center.x, item.z - best.center.z) ? candidate : best);
    return nearest.index === room.index;
  }).sort((a, b) => Number(b.kind === 'sofa') - Number(a.kind === 'sofa'));
  for (const item of items) {
    const seatX = item.kind === 'sofa' ? item.w * .22 : 0;
    const destination = localPoint(item, seatX, night ? -.13 : .04);
    const floorWithoutTarget = { ...layout, items: layout.items.filter(other => other.id !== item.id) };
    const margin = PERSON_CLEARANCE + .12;
    const candidates = [
      localPoint(item, seatX, item.d / 2 + margin),
      localPoint(item, -item.w / 2 - margin, night ? .15 : .04),
      localPoint(item, item.w / 2 + margin, night ? .15 : .04),
    ];
    for (const approach of candidates) {
      if (!clearWalkingSegment(floorWithoutTarget, approach, destination)) continue;
      if (lodgingWalkingPath(layout, room.destination, approach).length < 2) continue;
      const activity: LodgingActivity = {
        pose: night ? 'sleep' : 'sit', furnitureId: item.id, approach,
        position: [destination.x, night ? layout.kind === 'hotel' ? .96 : .84 : 0, destination.z],
        heading: item.yaw, seatHeight: item.kind === 'sofa' ? .78 : .64,
      };
      saved.set(key, activity); return activity;
    }
  }
  saved.set(key, null); return null;
}
