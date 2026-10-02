import { memo, useMemo } from 'react';
import { foodMaterial, getFoodKind, getFoodModel } from '../graphics/foodModels';

export const FoodPlate3D = memo(function FoodPlate3D({recipeId, scale=1}: {recipeId:string;scale?:number}) {
  const geometry=useMemo(()=>getFoodModel(getFoodKind(recipeId)),[recipeId]);
  return <mesh geometry={geometry} material={foodMaterial} scale={scale} castShadow receiveShadow dispose={null} />;
});
