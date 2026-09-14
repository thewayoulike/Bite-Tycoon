import { useEffect, useState } from 'react';
import * as THREE from 'three';

// A seamless, deterministic parquet tile: no external texture downloads.
export function WoodFloorMaterial() {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    ctx.fillStyle = '#59402c';
    ctx.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 8; row++) {
      for (let column = -1; column < 4; column++) {
        const x = column * 128 + (row % 2) * 64;
        const y = row * 64;
        const tone = 43 + random() * 13;
        ctx.fillStyle = `hsl(29, 36%, ${tone}%)`;
        ctx.fillRect(x + 1, y + 1, 126, 62);
        for (let grain = 0; grain < 36; grain++) {
          const gy = y + 3 + random() * 58;
          ctx.strokeStyle = `rgba(65, 34, 15, ${0.025 + random() * 0.1})`;
          ctx.lineWidth = 0.5 + random();
          ctx.beginPath();
          ctx.moveTo(x + 2, gy);
          ctx.bezierCurveTo(x + 35, gy - 3, x + 90, gy + 3, x + 126, gy);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,225,180,0.16)';
        ctx.fillRect(x + 2, y + 2, 124, 1);
      }
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(5, 5);
    map.anisotropy = 4;
    setTexture(map);
    return () => map.dispose();
  }, []);

  // Loading the map changes the shader defines; rebuild the initial untextured material.
  return <meshStandardMaterial key={texture?.uuid ?? 'floor-fallback'} color={texture ? '#ffffff' : '#b78a5e'} map={texture} roughness={0.58} />;
}
