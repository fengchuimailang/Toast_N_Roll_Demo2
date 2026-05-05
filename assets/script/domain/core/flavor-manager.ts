/**
 * 口味配置管理器
 * 负责加载和管理口味配置，包括食材图片映射
 */

import type { ChainItem, FlavorsData } from '../types/level';
import type { IngredientType, FlavorType } from '../types';

// 默认口味配置（作为后备）
const DEFAULT_FLAVOR_CONFIG: Record<FlavorType, Record<IngredientType, ChainItem>> = {
  original: {
    wheat: { id: 'wheat_original', name: '小麦', image: '/assets/ingredients_new/wheat.png' },
    flour: { id: 'flour_original', name: '面粉', image: '/assets/ingredients_new/flour.png' },
    dough: { id: 'dough_original', name: '面团', image: '/assets/ingredients_new/dough.png' },
    bread: { id: 'bread_original', name: '面包', image: '/assets/ingredients_new/bread.png' },
    toast: { id: 'toast_original', name: '吐司', image: '/assets/ingredients_new/toast.png' },
    gift: { id: 'gift_original', name: '原味礼盒', image: '/assets/ingredients_new/gift_origin.png' },
  },
  strawberry: {
    wheat: { id: 'wheat_strawberry', name: '草莓小麦', image: '/assets/ingredients_new/wheat.png' },
    flour: { id: 'flour_strawberry', name: '草莓面粉', image: '/assets/ingredients_new/flour.png' },
    dough: { id: 'dough_strawberry', name: '草莓面团', image: '/assets/ingredients_new/dough.png' },
    bread: { id: 'bread_strawberry', name: '草莓面包', image: '/assets/ingredients_new/bread.png' },
    toast: { id: 'toast_strawberry', name: '草莓吐司', image: '/assets/ingredients_new/toast.png' },
    gift: { id: 'gift_strawberry', name: '草莓礼盒', image: '/assets/ingredients_new/gift_strawberry.png' },
  },
  matcha: {
    wheat: { id: 'wheat_matcha', name: '抹茶小麦', image: '/assets/ingredients_new/wheat.png' },
    flour: { id: 'flour_matcha', name: '抹茶面粉', image: '/assets/ingredients_new/flour.png' },
    dough: { id: 'dough_matcha', name: '抹茶面团', image: '/assets/ingredients_new/dough.png' },
    bread: { id: 'bread_matcha', name: '抹茶面包', image: '/assets/ingredients_new/bread.png' },
    toast: { id: 'toast_matcha', name: '抹茶吐司', image: '/assets/ingredients_new/toast.png' },
    gift: { id: 'gift_matcha', name: '抹茶礼盒', image: '/assets/ingredients_new/gift_matcha.png' },
  },
  mango: {
    wheat: { id: 'wheat_mango', name: '芒果小麦', image: '/assets/ingredients_new/wheat.png' },
    flour: { id: 'flour_mango', name: '芒果面粉', image: '/assets/ingredients_new/flour.png' },
    dough: { id: 'dough_mango', name: '芒果面团', image: '/assets/ingredients_new/dough.png' },
    bread: { id: 'bread_mango', name: '芒果面包', image: '/assets/ingredients_new/bread.png' },
    toast: { id: 'toast_mango', name: '芒果吐司', image: '/assets/ingredients_new/toast.png' },
    gift: { id: 'gift_mango', name: '芒果礼盒', image: '/assets/ingredients_new/gift_mango.png' },
  },
  sea_buckthorn_berry: {
    wheat: { id: 'wheat_seaberry', name: '沙棘小麦', image: '/assets/ingredients_new/wheat.png' },
    flour: { id: 'flour_seaberry', name: '沙棘面粉', image: '/assets/ingredients_new/flour.png' },
    dough: { id: 'dough_seaberry', name: '沙棘面团', image: '/assets/ingredients_new/dough.png' },
    bread: { id: 'bread_seaberry', name: '沙棘面包', image: '/assets/ingredients_new/bread.png' },
    toast: { id: 'toast_seaberry', name: '沙棘吐司', image: '/assets/ingredients_new/toast.png' },
    gift: { id: 'gift_seaberry', name: '沙棘礼盒', image: '/assets/ingredients_new/gift_seaberry.png' },
  },
  ice_cream: {
    wheat: { id: 'wheat_icecream', name: '冰淇淋小麦', image: '/assets/ingredients_new/wheat.png' },
    flour: { id: 'flour_icecream', name: '冰淇淋面粉', image: '/assets/ingredients_new/flour.png' },
    dough: { id: 'dough_icecream', name: '冰淇淋面团', image: '/assets/ingredients_new/dough.png' },
    bread: { id: 'bread_icecream', name: '冰淇淋面包', image: '/assets/ingredients_new/bread.png' },
    toast: { id: 'toast_icecream', name: '冰淇淋吐司', image: '/assets/ingredients_new/toast.png' },
    gift: { id: 'gift_icecream', name: '冰淇淋礼盒', image: '/assets/ingredients_new/gift_icecream.png' },
  },
  spicy: {
    wheat: { id: 'wheat_chili', name: '辣椒小麦', image: '/assets/ingredients_new/wheat.png' },
    flour: { id: 'flour_chili', name: '辣椒面粉', image: '/assets/ingredients_new/flour.png' },
    dough: { id: 'dough_chili', name: '辣椒面团', image: '/assets/ingredients_new/dough.png' },
    bread: { id: 'bread_chili', name: '辣椒面包', image: '/assets/ingredients_new/bread.png' },
    toast: { id: 'toast_chili', name: '辣椒吐司', image: '/assets/ingredients_new/toast.png' },
    gift: { id: 'gift_chili', name: '辣椒礼盒', image: '/assets/ingredients_new/gift_spicy.png' },
  },
  passion_fruit: {
    wheat: { id: 'wheat_passionfruit', name: '百香果小麦', image: '/assets/ingredients_new/wheat.png' },
    flour: { id: 'flour_passionfruit', name: '百香果面粉', image: '/assets/ingredients_new/flour.png' },
    dough: { id: 'dough_passionfruit', name: '百香果面团', image: '/assets/ingredients_new/dough.png' },
    bread: { id: 'bread_passionfruit', name: '百香果面包', image: '/assets/ingredients_new/bread.png' },
    toast: { id: 'toast_passionfruit', name: '百香果吐司', image: '/assets/ingredients_new/toast.png' },
    gift: { id: 'gift_passionfruit', name: '百香果礼盒', image: '/assets/ingredients_new/gift_passionfruit.png' },
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
        '4': 'bread',
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

  /**
   * 获取口味徽章图片路径
   * 原味返回 null，其他口味返回徽章图片路径
   */
  getFlavorBadgeImage(flavor: FlavorType): string | null {
    if (flavor === 'original') {
      return null;
    }
    
    // Figma 导出的口味徽章映射
    const badgeMap: Record<string, string> = {
      strawberry: '/assets/flavors/flavor_strawberry_36.png',
      matcha: '/assets/flavors/flavor_matcha_36.png',
      mango: '/assets/flavors/flavor_mango_36.png',
      sea_buckthorn_berry: '/assets/flavors/flavor_seaberry_36.png',
      ice_cream: '/assets/flavors/flavor_icecream_36.png',
      spicy: '/assets/flavors/flavor_chili_36.png',
      passion_fruit: '/assets/flavors/flavor_passionfruit_36.png',
      unknown: '/assets/flavors/flavor_unknown_36.png',
    };
    
    return badgeMap[flavor] ?? null;
  }
}

// 导出单例
export const flavorManager = new FlavorManager();
