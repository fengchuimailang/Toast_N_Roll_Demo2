import { Prefab, resources } from 'cc';

import { SpriteFrameLoader } from './SpriteFrameLoader';

const CRITICAL_PREFAB_KEYS = [
  'prefabs/Cell',
  'prefabs/HudRoot',
  'prefabs/ToolBarRoot',
  'prefabs/HomeOverlayRoot',
  'prefabs/LevelSelectOverlayRoot',
  'prefabs/SettlementOverlayRoot',
  'prefabs/LoadingOverlayRoot',
  'prefabs/SettingsOverlayRoot',
  'prefabs/TutorialOverlayRoot',
  'prefabs/MessageOverlayRoot',
] as const;

const CRITICAL_SPRITE_KEYS = [
  'ui/header_coin',
  'ui/header_hp',
  'ui/header_star',
  'ui/star',
  'bg/bg_origin',
  'bg/bg_savanna_unlocked',
  'bg/bg_glacier_unlocked',
  'bg/bg_rainforest_unlocked',
  'bg/bg_desert_unlocked',
  'bg/bg_bamboo_unlocked',
  'bg/bg_savanna_locked',
  'bg/bg_glacier_locked',
  'bg/bg_rainforest_locked',
  'bg/bg_desert_locked',
  'bg/bg_bamboo_locked',
  'tool/tool_remove_badge',
  'tool/tool_shuffle_badge',
  'tool/tool_attract_badge',
  'ingredients_new/toast',
  'ingredients_new/wheat',
  'ingredients_new/flour',
  'ingredients_new/dough',
  'ingredients_new/bread',
] as const;

function preloadPrefab(key: string): Promise<void> {
  return new Promise((resolve) => {
    resources.preload(key, Prefab, (error) => {
      if (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isMissingPrefab = message.includes(`doesn't contain ${key}`);
        if (!isMissingPrefab) {
          console.warn('[CocosAssetWarmup] Failed to preload prefab', key, error);
        }
      }

      resolve();
    });
  });
}

export class CocosAssetWarmup {
  private readonly spriteFrameLoader = new SpriteFrameLoader();
  private preloadPromise: Promise<void> | null = null;

  public preloadCriticalAssets(): Promise<void> {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    this.preloadPromise = Promise.all([
      Promise.all(CRITICAL_PREFAB_KEYS.map((key) => preloadPrefab(key))).then(() => undefined),
      this.spriteFrameLoader.preload([...CRITICAL_SPRITE_KEYS]),
    ]).then(() => undefined);

    return this.preloadPromise;
  }
}
