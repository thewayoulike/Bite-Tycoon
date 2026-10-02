import { memo, useEffect, useMemo } from 'react';
import { ModelParts } from '../graphics/modelParts';

/** Architectural details are merged so a whole facade needs only two meshes. */
export const LandmarkDetails3D = memo(function LandmarkDetails3D({ height, hotel = false, isNight }: {
  height: number; hotel?: boolean; isNight: boolean;
}) {
  const model = useMemo(() => {
    const trim = new ModelParts(), glass = new ModelParts();
    const width = hotel ? 24 : 16;
    for (const side of [-1, 1]) {
      for (let y = hotel ? 6.5 : 3; y < height - 1; y += hotel ? 3.8 : 3.5) {
        trim.box([0, y - 1.5, side * 8.08], [width + .25, hotel ? .19 : .11, .2], hotel ? '#c9bda5' : '#64767b');
        trim.box([side * (width / 2 + .07), y - 1.5, 0], [.17, hotel ? .19 : .11, 16.2], hotel ? '#c9bda5' : '#64767b');
        if (hotel) {
          for (let x = -9.5; x < 11; x += 3.8) {
            trim.box([x, y, side * 8.13], [2.4, 2.95, .24], '#c9bda5');
            glass.box([x, y, side * 8.28], [1.98, 2.52, .09], isNight && Math.round(x + y) % 3 ? '#bba074' : '#425e63');
            trim.box([x, y, side * 8.36], [.075, 2.56, .05], '#a69e8b');
            trim.box([x, y - 1.45, side * 8.36], [2.62, .17, .56], '#ddd1b9');
          }
          for (const z of [-5, 0, 5]) {
            trim.box([side * 12.13, y, z], [.24, 2.95, 2.4], '#c9bda5');
            glass.box([side * 12.28, y, z], [.09, 2.52, 1.98], '#425e63');
          }
        }
      }
      if (!hotel) for (let x = -6; x <= 6; x += 2) {
        trim.box([x, height / 2, side * 8.09], [.07, height, .1], '#59696f');
        trim.box([side * 8.09, height / 2, x], [.1, height, .07], '#59696f');
      }
    }
    if (hotel) {
      trim.box([0, 17.7, 0], [24.6, .4, 16.6], '#d6c9b1');
      trim.box([0, .3, 8.6], [8, .6, 1.4], '#aaab9a');
    }
    return { trim: trim.finish(), glass: hotel ? glass.finish() : null };
  }, [height, hotel, isNight]);
  useEffect(() => () => { model.trim.dispose(); model.glass?.dispose(); }, [model]);
  return <group dispose={null}>
    <mesh geometry={model.trim} receiveShadow><meshStandardMaterial vertexColors roughness={hotel ? .8 : .38} metalness={hotel ? 0 : .35}/></mesh>
    {model.glass && <mesh geometry={model.glass}><meshStandardMaterial vertexColors roughness={.24} metalness={.3} emissive={isNight ? '#b6a17e' : '#000000'} emissiveIntensity={.16}/></mesh>}
  </group>;
});
