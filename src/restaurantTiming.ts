import type {Recipe} from './data/recipes';

// Recipe times are service seconds at 1× with one rested chef and healthy equipment.
// The calendar is compressed separately; speed controls must accelerate both equally.
export const COOKING_WORK_PER_SECOND = 100;
export const RESTAURANT_STEP_SECONDS = .1;
export const basePreparationSeconds = (recipe: Recipe) => recipe.cookingTime * 100 / COOKING_WORK_PER_SECOND;
