/**
 * 食材系统
 * 管理食材的创建、进阶和属性
 */

import type { Ingredient, IngredientType, FlavorType, IngredientTier } from '../types';
import {
  randomIngredientType,
  randomFlavor,
  generateId,
  GIFT_VALUES,
} from '../types';
import { flavorManager } from './flavor-manager';

/**
 * 食材进阶映射
 */
const INGREDIENT_ADVANCEMENT: Record<IngredientType, IngredientType | null> = {
  wheat: 'flour',
  flour: 'dough',
  dough: 'bread',
  bread: 'toast',
  toast: 'gift',
  gift: null,
};

/**
 * 获取食材阶级
 */
export function getIngredientTier(type: IngredientType): IngredientTier {
  const tierMap: Record<IngredientType, IngredientTier> = {
    wheat: 1,
    flour: 2,
    dough: 3,
    bread: 4,
    toast: 5,
    gift: 6,
  };
  return tierMap[type];
}

/**
 * 创建新食材
 */
export function createIngredient(
  type?: IngredientType,
  flavor?: FlavorType
): Ingredient {
  const finalType = type ?? randomIngredientType();
  const finalFlavor = flavor ?? randomFlavor();
  const tier = getIngredientTier(finalType);

  // 使用 flavorManager 获取配置
  const config = flavorManager.getIngredientConfig(finalFlavor, finalType);

  return {
    id: generateId(),
    tier,
    type: finalType,
    flavor: finalFlavor,
    image: config.image,
    name: config.name,
  };
}

/**
 * 进阶食材
 */
export function advanceIngredient(ingredient: Ingredient): Ingredient | null {
  return advanceIngredientWithFlavor(ingredient, ingredient.flavor);
}

/**
 * 使用指定口味进阶食材
 */
export function advanceIngredientWithFlavor(
  ingredient: Ingredient,
  flavor: FlavorType
): Ingredient | null {
  const nextType = INGREDIENT_ADVANCEMENT[ingredient.type];
  if (!nextType) return null;

  return createIngredient(nextType, flavor);
}

/**
 * 检查两个食材是否可以匹配（同类型）
 */
export function canMatch(a: Ingredient, b: Ingredient): boolean {
  return a.type === b.type;
}

/**
 * 检查是否是礼盒
 */
export function isGiftBox(ingredient: Ingredient): boolean {
  return ingredient.type === 'gift';
}

/**
 * 获取礼盒价值
 */
export function getGiftValue(flavor: FlavorType): number {
  return GIFT_VALUES[flavor];
}

/**
 * 创建特定口味的食材
 */
export function createIngredientWithFlavor(
  type: IngredientType,
  flavor: FlavorType
): Ingredient {
  return createIngredient(type, flavor);
}
