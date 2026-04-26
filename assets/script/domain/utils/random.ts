/**
 * 随机工具
 * 提供游戏所需的随机生成功能
 */

import type { IngredientType, FlavorType } from '../types';
import { SPAWN_RATES } from '../types';

/**
 * 生成随机整数 [min, max]
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 根据权重随机选择
 */
export function weightedRandom<T>(items: { item: T; weight: number }[]): T {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  let random = Math.random() * totalWeight;

  for (const { item, weight } of items) {
    random -= weight;
    if (random <= 0) {
      return item;
    }
  }

  return items[items.length - 1].item;
}

/**
 * 随机生成食材类型（根据生成概率）
 */
export function randomIngredientType(): IngredientType {
  const types: IngredientType[] = ['wheat', 'flour', 'dough', 'baking'];
  const weights = types.map(type => SPAWN_RATES[type]);

  const items = types.map((type, index) => ({
    item: type,
    weight: weights[index],
  }));

  return weightedRandom(items);
}

/**
 * 随机生成口味
 */
export function randomFlavor(): FlavorType {
  const flavors: FlavorType[] = ['original', 'matcha', 'strawberry'];
  // 原味概率更高
  const weights = [0.5, 0.3, 0.2];

  const items = flavors.map((flavor, index) => ({
    item: flavor,
    weight: weights[index],
  }));

  return weightedRandom(items);
}

/**
 * 从数组中随机选择一个元素
 */
export function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 打乱数组（Fisher-Yates 算法）
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 随机生成顾客头像
 */
export function randomCustomerAvatar(): string {
  const avatars = [
    '/assets/customers/figma/rabbit.png',
    '/assets/customers/figma/sheep.png',
    '/assets/customers/figma/koala.png',
    '/assets/customers/figma/zebra.png',
    '/assets/customers/figma/suricata.png',
    '/assets/customers/figma/bradypod.png',
    '/assets/customers/figma/penguin.png',
    '/assets/customers/figma/sea_bear.png',
    '/assets/customers/figma/seal.png',
    '/assets/customers/figma/giraffe.png',
    '/assets/customers/figma/crocodile.png',
    '/assets/customers/figma/orangutan.png',
    '/assets/customers/figma/monkey.png',
    '/assets/customers/figma/camel.png',
    '/assets/customers/figma/lion.png',
    '/assets/customers/figma/redpanda.png',
    '/assets/customers/figma/panda.png',
    '/assets/customers/figma/fennecfox.png',
    '/assets/customers/figma/jaguar.png',
    '/assets/customers/figma/honeybadger.png',
  ];
  return randomPick(avatars);
}

/**
 * 随机生成顾客需求数量
 */
export function randomDemandCount(): number {
  // 1-3个礼盒
  return randomInt(1, 3);
}
