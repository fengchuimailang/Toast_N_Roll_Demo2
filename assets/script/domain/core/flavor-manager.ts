/**
 * 口味配置管理器
 * 负责加载和管理口味配置，包括食材图片映射
 */

import type { ChainItem, FlavorsData } from '../types/level';
import type { IngredientType, FlavorType } from '../types';

// 默认口味配置（作为后备）
const DEFAULT_FLAVOR_CONFIG: Record<FlavorType, Record<IngredientType, ChainItem>> = {
  original: {
    wheat: { id: 'wheat_original', name: '小麦', image: '/assets/ingredients/block_wheat_original.png' },
    flour: { id: 'flour_original', name: '面粉', image: '/assets/ingredients/block_flour_original.png' },
    dough: { id: 'dough_original', name: '面团', image: '/assets/ingredients/block_dough_original.png' },
    baking: { id: 'bread_original', name: '面包坯', image: '/assets/ingredients/block_bread_original.png' },
    toast: { id: 'toast_original', name: '吐司', image: '/assets/ingredients/block_toast_original.png' },
    gift: { id: 'gift_original', name: '原味礼盒', image: '/assets/ingredients/block_gift_original.png' },
  },
  matcha: {
    wheat: { id: 'wheat_matcha', name: '抹茶小麦', image: '/assets/ingredients/block_wheat_matcha.png' },
    flour: { id: 'flour_matcha', name: '抹茶面粉', image: '/assets/ingredients/block_flour_matcha.png' },
    dough: { id: 'dough_matcha', name: '抹茶面团', image: '/assets/ingredients/block_dough_matcha.png' },
    baking: { id: 'bread_matcha', name: '抹茶面包坯', image: '/assets/ingredients/block_bread_matcha.png' },
    toast: { id: 'toast_matcha', name: '抹茶吐司', image: '/assets/ingredients/block_toast_matcha.png' },
    gift: { id: 'gift_matcha', name: '抹茶礼盒', image: '/assets/ingredients/block_gift_matcha.png' },
  },
  strawberry: {
    wheat: { id: 'wheat_strawberry', name: '草莓小麦', image: '/assets/ingredients/block_wheat_strawberry.png' },
    flour: { id: 'flour_strawberry', name: '草莓面粉', image: '/assets/ingredients/block_flour_strawberry.png' },
    dough: { id: 'dough_strawberry', name: '草莓面团', image: '/assets/ingredients/block_dough_strawberry.png' },
    baking: { id: 'bread_strawberry', name: '草莓面包坯', image: '/assets/ingredients/block_bread_strawberry.png' },
    toast: { id: 'toast_strawberry', name: '草莓吐司', image: '/assets/ingredients/block_toast_strawberry.png' },
    gift: { id: 'gift_strawberry', name: '草莓礼盒', image: '/assets/ingredients/block_gift_strawberry.png' },
  },
};

class FlavorManager {
  private flavorConfigs: Map<FlavorType, Record<IngredientType, ChainItem>> = new Map();
  private loaded: boolean = false;

  private applyFlavorsData(data: FlavorsData): void {
    this.flavorConfigs.clear();

    for (const flavor of data.flavors) {
      const flavorId = flavor.flavorId as FlavorType;
      const chainMap: Record<IngredientType, ChainItem> = {} as Record<IngredientType, ChainItem>;

      const tierMap: Record<string, IngredientType> = {
        '1': 'wheat',
        '2': 'flour',
        '3': 'dough',
        '4': 'baking',
        '5': 'toast',
        '6': 'gift',
      };

      for (const [tier, item] of Object.entries(flavor.chain)) {
        const type = tierMap[tier];
        if (type) {
          chainMap[type] = item as ChainItem;
        }
      }

      this.flavorConfigs.set(flavorId, chainMap);
    }

    this.loaded = true;
  }

  applyFallbackConfigs(): void {
    this.flavorConfigs.clear();
    for (const [flavor, config] of Object.entries(DEFAULT_FLAVOR_CONFIG)) {
      this.flavorConfigs.set(flavor as FlavorType, config);
    }
    this.loaded = true;
  }

  loadFromData(data: FlavorsData): void {
    this.applyFlavorsData(data);
  }

  /**
   * 加载口味配置
   */
  async loadFlavors(): Promise<void> {
    if (this.loaded) return;

    try {
      const response = await fetch('/assets/flavors/flavors.json');
      if (!response.ok) {
        throw new Error(`Failed to load flavors: ${response.status}`);
      }

      this.applyFlavorsData(await response.json() as FlavorsData);
    } catch (error) {
      console.error('[FlavorManager] Failed to load flavors, using defaults:', error);
      this.applyFallbackConfigs();
    }
  }

  /**
   * 获取指定口味和类型的食材配置
   */
  getIngredientConfig(flavor: FlavorType, type: IngredientType): ChainItem {
    const flavorConfig = this.flavorConfigs.get(flavor);
    if (flavorConfig && flavorConfig[type]) {
      return flavorConfig[type];
    }
    // 返回默认配置
    return DEFAULT_FLAVOR_CONFIG[flavor]?.[type] ?? DEFAULT_FLAVOR_CONFIG.original[type];
  }

  /**
   * 获取食材图片路径
   */
  getIngredientImage(flavor: FlavorType, type: IngredientType): string {
    return this.getIngredientConfig(flavor, type).image;
  }

  /**
   * 获取食材名称
   */
  getIngredientName(flavor: FlavorType, type: IngredientType): string {
    return this.getIngredientConfig(flavor, type).name;
  }

  /**
   * 获取所有口味的图片 URL 列表（用于预加载）
   */
  getAllImageUrls(): string[] {
    const urls: string[] = [];

    // 从已加载的配置中收集
    for (const flavorConfig of this.flavorConfigs.values()) {
      for (const item of Object.values(flavorConfig)) {
        if (item.image && !urls.includes(item.image)) {
          urls.push(item.image);
        }
      }
    }

    // 如果没有加载成功，从默认配置收集
    if (urls.length === 0) {
      for (const flavorConfig of Object.values(DEFAULT_FLAVOR_CONFIG)) {
        for (const item of Object.values(flavorConfig)) {
          if (item.image && !urls.includes(item.image)) {
            urls.push(item.image);
          }
        }
      }
    }

    return urls;
  }
}

// 导出单例
export const flavorManager = new FlavorManager();
