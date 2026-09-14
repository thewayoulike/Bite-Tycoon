import React, { memo } from 'react';
import { Box, Cylinder, Sphere, Torus } from '@react-three/drei';

export const WallSconce3D = memo(({ position, rotation = [0, 0, 0] }: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) => (
  <group position={position} rotation={rotation}>
    {/* Brass mounting backplate */}
    <Cylinder args={[0.15, 0.15, 0.04, 16]} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.25} />
    </Cylinder>
    {/* Curved Gooseneck Arm */}
    <Torus args={[0.12, 0.02, 12, 16, Math.PI]} position={[0, 0.05, 0.1]} rotation={[0, 0, -Math.PI / 2]}>
      <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.2} />
    </Torus>
    {/* Frosted Glass Fluted Lamp Shade */}
    <Cylinder args={[0.18, 0.1, 0.22, 16]} position={[0, 0.22, 0.18]}>
      <meshStandardMaterial color="#fef3c7" emissive="#fde68a" emissiveIntensity={0.6} transparent opacity={0.85} roughness={0.3} />
    </Cylinder>
    {/* Warm Interior Glow */}
  </group>
));

export const WindowPlanterBox3D = memo(({ position, width }: { position: [number, number, number]; width: number }) => (
  <group position={position}>
    {/* Terracotta / Wood Planter Box */}
    <Box args={[width - 0.4, 0.28, 0.35]} position={[0, 0, 0.18]} castShadow>
      <meshStandardMaterial color="#9a3412" roughness={0.7} />
    </Box>
    {/* Dark Potting Soil */}
    <Box args={[width - 0.48, 0.05, 0.28]} position={[0, 0.13, 0.18]}>
      <meshStandardMaterial color="#291e17" roughness={0.9} />
    </Box>
    {/* Lush Greenery Foliage and Flowers */}
    {Array.from({ length: Math.max(3, Math.floor((width - 0.4) / 0.8)) }).map((_, i) => {
      const count = Math.max(3, Math.floor((width - 0.4) / 0.8));
      const step = (width - 0.8) / (count - 1);
      const px = -((width - 0.8) / 2) + i * step;
      const flowerColors = ["#e11d48", "#f43f5e", "#fb7185", "#f59e0b", "#ec4899"];
      const fColor = flowerColors[i % flowerColors.length];
      return (
        <group key={`pl-${i}`} position={[px, 0.2, 0.18]}>
          {/* Leaf clusters */}
          <Sphere args={[0.14, 10, 10]} scale={[1.2, 0.8, 1.1]} position={[0, 0, 0]}>
            <meshStandardMaterial color={i % 2 === 0 ? "#15803d" : "#166534"} roughness={0.6} />
          </Sphere>
          <Sphere args={[0.1, 8, 8]} position={[0.08, -0.05, 0.08]}>
            <meshStandardMaterial color="#22c55e" roughness={0.6} />
          </Sphere>
          {/* Bright Blossoms */}
          <Sphere args={[0.045, 8, 8]} position={[-0.04, 0.1, 0.04]}>
            <meshStandardMaterial color={fColor} emissive={fColor} emissiveIntensity={0.2} />
          </Sphere>
          <Sphere args={[0.04, 8, 8]} position={[0.05, 0.09, -0.02]}>
            <meshStandardMaterial color={fColor} emissive={fColor} emissiveIntensity={0.2} />
          </Sphere>
        </group>
      );
    })}
  </group>
));

export const WindowCurtains3D = memo(({ windowWidth, windowHeight }: { windowWidth: number; windowHeight: number }) => {
  const drapeWidth = 0.55;
  return (
    <group position={[0, 0, 0.08]}>
      {/* Brass Curtain Pole with Finials */}
      <Cylinder args={[0.02, 0.02, windowWidth + 0.6, 16]} rotation={[0, 0, Math.PI / 2]} position={[0, windowHeight / 2 + 0.15, 0.05]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Cylinder>
      {/* Left and Right Brass Decorative Spherical Finials */}
      <Sphere args={[0.05, 12, 12]} position={[-(windowWidth + 0.6) / 2, windowHeight / 2 + 0.15, 0.05]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Sphere>
      <Sphere args={[0.05, 12, 12]} position={[(windowWidth + 0.6) / 2, windowHeight / 2 + 0.15, 0.05]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Sphere>

      {/* Left Elegant Tied Drapery */}
      <group position={[-windowWidth / 2 + drapeWidth / 2 - 0.1, 0, 0.05]}>
        <Box args={[drapeWidth, windowHeight + 0.2, 0.08]} position={[0, 0, 0]} castShadow>
          <meshStandardMaterial color="#991b1b" roughness={0.85} />
        </Box>
        {/* Gold Rope Tieback */}
        <Torus args={[0.18, 0.02, 8, 16]} position={[0.05, -0.2, 0.02]} rotation={[0, Math.PI / 4, 0]}>
          <meshStandardMaterial color="#fbbf24" metalness={0.8} />
        </Torus>
      </group>

      {/* Right Elegant Tied Drapery */}
      <group position={[windowWidth / 2 - drapeWidth / 2 + 0.1, 0, 0.05]}>
        <Box args={[drapeWidth, windowHeight + 0.2, 0.08]} position={[0, 0, 0]} castShadow>
          <meshStandardMaterial color="#991b1b" roughness={0.85} />
        </Box>
        {/* Gold Rope Tieback */}
        <Torus args={[0.18, 0.02, 8, 16]} position={[-0.05, -0.2, 0.02]} rotation={[0, -Math.PI / 4, 0]}>
          <meshStandardMaterial color="#fbbf24" metalness={0.8} />
        </Torus>
      </group>
    </group>
  );
});

export const AttractiveRestaurantWall = memo(({
  position,
  rotation,
  width,
  height,
  layout = 0,
  customWallColor,
  customFrameColor,
  isNight = false
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  layout?: number;
  customWallColor?: string;
  customFrameColor?: string;
  isNight?: boolean;
}) => {
  const designs = [
    { name: "Classic French Bistro", w: 5.5, h: 5.2, y: 5.4, count: width > 20 ? 3 : 1, mullions: true },
    { name: "Modern Panoramic", w: 7.5, h: 5.5, y: 5.2, count: width > 20 ? 2 : 1, mullions: true },
    { name: "Arched Heritage", w: 4.8, h: 6.2, y: 5.0, count: width > 20 ? 4 : 2, mullions: true },
    { name: "High Clerestory", w: 5.5, h: 2.5, y: 7.8, count: width > 20 ? 4 : 2, mullions: true },
    { name: "Storefront Boutique", w: 8.0, h: 7.0, y: 4.8, count: width > 20 ? 3 : 1, mullions: true },
    { name: "Solid Brick & Wainscot", w: 0, h: 0, y: 0, count: 0, mullions: false },
  ];
  const currentDesign = designs[layout % designs.length];
  const hasWindows = currentDesign.count > 0 && width > 10;
  const numWindows = hasWindows ? currentDesign.count : 0;
  const windowWidth = currentDesign.w;
  const windowHeight = currentDesign.h;
  const windowY = currentDesign.y;
  const bottomHeight = hasWindows ? windowY - windowHeight / 2 : 0;
  const topHeight = hasWindows ? height - (windowY + windowHeight / 2) : 0;

  // Rich Harmonious Materials
  const upperWallColor = customWallColor || "#fbf7ee"; // Warm off-white bistro plaster
  const wainscotWoodColor = customFrameColor || "#3f2314"; // Rich mahogany/walnut wood
  const frameColor = customFrameColor || "#2c1810"; // Dark espresso wood frame
  const glassColor = isNight ? "#fef08a" : "#e0f2fe"; // Warm interior light at night, sky reflection in day
  const glassOpacity = isNight ? 0.45 : 0.28;

  return (
    <group position={position} rotation={rotation}>
      {/* Full Solid Wall vs Wall with Windows */}
      {!hasWindows ? (
        <group>
          {/* Main Upper Wall */}
          <Box args={[width, height, 0.5]} position={[0, height / 2, 0]} receiveShadow castShadow>
            <meshStandardMaterial color={upperWallColor} roughness={0.8} />
          </Box>
        </group>
      ) : (
        <group>
          {/* Lower Spandrel Wall under windows */}
          <Box args={[width, bottomHeight, 0.5]} position={[0, bottomHeight / 2, 0]} receiveShadow castShadow>
            <meshStandardMaterial color={upperWallColor} roughness={0.8} />
          </Box>
          {/* Upper Header Wall above windows */}
          <Box args={[width, topHeight, 0.5]} position={[0, height - topHeight / 2, 0]} receiveShadow castShadow>
            <meshStandardMaterial color={upperWallColor} roughness={0.8} />
          </Box>

          {/* Windows with Molded Architraves, Deep Sills, and Mullion Grids */}
          {Array.from({ length: numWindows }).map((_, i) => {
            const spacing = width / numWindows;
            const x = -width / 2 + spacing / 2 + i * spacing;
            return (
              <group key={`win-${i}`} position={[x, windowY, 0]}>
                {/* Translucent Glass Pane with Environment Reflections */}
                <Box args={[windowWidth, windowHeight, 0.08]}>
                  <meshStandardMaterial
                    color={glassColor}
                    transparent
                    opacity={glassOpacity}
                    roughness={0.08}
                    metalness={0.2}
                    depthWrite={false}
                  />
                </Box>

                {/* Heavy Molded Wooden Window Surround */}
                {/* Top Header Cornice */}
                <Box args={[windowWidth + 0.6, 0.25, 0.68]} position={[0, windowHeight / 2 + 0.125, 0]} castShadow>
                  <meshStandardMaterial color={frameColor} roughness={0.6} />
                </Box>
                {/* Deep Protruding Window Sill */}
                <Box args={[windowWidth + 0.7, 0.24, 0.8]} position={[0, -windowHeight / 2 - 0.12, 0.06]} castShadow receiveShadow>
                  <meshStandardMaterial color={frameColor} roughness={0.6} />
                </Box>
                {/* Left & Right Jamb Pillars */}
                <Box args={[0.26, windowHeight + 0.1, 0.65]} position={[-windowWidth / 2 - 0.13, 0, 0]} castShadow>
                  <meshStandardMaterial color={frameColor} roughness={0.6} />
                </Box>
                <Box args={[0.26, windowHeight + 0.1, 0.65]} position={[windowWidth / 2 + 0.13, 0, 0]} castShadow>
                  <meshStandardMaterial color={frameColor} roughness={0.6} />
                </Box>

                {/* Classic Divided Lite French Mullion Bars */}
                {currentDesign.mullions && (
                  <group>
                    {/* Vertical Mullion Bars */}
                    <Box args={[0.1, windowHeight, 0.12]} position={[-windowWidth / 4, 0, 0]}>
                      <meshStandardMaterial color={frameColor} roughness={0.5} />
                    </Box>
                    <Box args={[0.1, windowHeight, 0.12]} position={[0, 0, 0]}>
                      <meshStandardMaterial color={frameColor} roughness={0.5} />
                    </Box>
                    <Box args={[0.1, windowHeight, 0.12]} position={[windowWidth / 4, 0, 0]}>
                      <meshStandardMaterial color={frameColor} roughness={0.5} />
                    </Box>
                    {/* Horizontal Transom Bars */}
                    <Box args={[windowWidth, 0.1, 0.12]} position={[0, -windowHeight / 4, 0]}>
                      <meshStandardMaterial color={frameColor} roughness={0.5} />
                    </Box>
                    <Box args={[windowWidth, 0.1, 0.12]} position={[0, windowHeight / 4, 0]}>
                      <meshStandardMaterial color={frameColor} roughness={0.5} />
                    </Box>
                  </group>
                )}

                {/* Rich Fabric Drapes on both sides */}
                <WindowCurtains3D windowWidth={windowWidth} windowHeight={windowHeight} />

                {/* Outdoor Flowered Window Planter on the exterior ledge */}
                <WindowPlanterBox3D position={[0, -windowHeight / 2 - 0.25, -0.32]} width={windowWidth} />
              </group>
            );
          })}

          {/* Solid Wall Spacers between windows */}
          {Array.from({ length: numWindows + 1 }).map((_, i) => {
            const spacing = width / numWindows;
            const pillarWidth = spacing - windowWidth;
            let x = 0;
            let pWidth = pillarWidth;
            if (i === 0) {
              pWidth = pillarWidth / 2;
              x = -width / 2 + pWidth / 2;
            } else if (i === numWindows) {
              pWidth = pillarWidth / 2;
              x = width / 2 - pWidth / 2;
            } else {
              x = -width / 2 + i * spacing;
            }
            return (
              <Box key={`pil-${i}`} args={[pWidth, windowHeight, 0.5]} position={[x, windowY, 0]} receiveShadow castShadow>
                <meshStandardMaterial color={upperWallColor} roughness={0.8} />
              </Box>
            );
          })}
        </group>
      )}

      {/* LOWER WAINSCOT WOOD PANELING (Classic Bistro Architecture) */}
      {/* Base Plinth Kickplate at floor */}
      <Box args={[width + 0.1, 0.25, 0.65]} position={[0, 0.125, 0]} receiveShadow castShadow>
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </Box>
      {/* Wainscot Raised Wood Panels (1.8m height) */}
      <Box args={[width + 0.05, 1.6, 0.58]} position={[0, 1.05, 0]} receiveShadow castShadow>
        <meshStandardMaterial color={wainscotWoodColor} roughness={0.65} />
      </Box>
      {/* Decorative Chair-Rail Trim Molding with Brass Inlay */}
      <Box args={[width + 0.12, 0.16, 0.66]} position={[0, 1.9, 0]} receiveShadow castShadow>
        <meshStandardMaterial color={frameColor} roughness={0.5} />
      </Box>
      <Box args={[width + 0.14, 0.03, 0.67]} position={[0, 1.95, 0]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
      </Box>

      {/* TOP CEILING CROWN MOLDING */}
      <Box args={[width + 0.1, 0.35, 0.64]} position={[0, height - 0.175, 0]} receiveShadow castShadow>
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </Box>

      {/* ELEGANT WALL SCONCES BETWEEN WINDOWS */}
      {width > 12 && (
        <group>
          <WallSconce3D position={[-width / 3.5, 3.2, 0.28]} />
          <WallSconce3D position={[width / 3.5, 3.2, 0.28]} />
        </group>
      )}
    </group>
  );
});
