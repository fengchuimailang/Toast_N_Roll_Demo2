import { JsonAsset, resources } from 'cc';

import type { FlavorsData, LevelConfig } from '../domain/types/level';

export interface GameConfigData {
  version: string;
  totalLevels: number;
}

function loadJson<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    resources.load(path, JsonAsset, (error, asset) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(asset.json as T);
    });
  });
}

export class CocosResourceLoader {
  loadGameConfig(): Promise<GameConfigData> {
    return loadJson<GameConfigData>('config/game');
  }

  loadFlavors(): Promise<FlavorsData> {
    return loadJson<FlavorsData>('flavors/flavors');
  }

  loadLevel(levelId: number): Promise<LevelConfig> {
    const fileName = `level-${String(levelId).padStart(3, '0')}`;
    return loadJson<LevelConfig>(`levels/${fileName}`);
  }
}
