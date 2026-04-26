/**
 * 关卡系统类型定义
 */

// 口味分布配置
export interface FlavorDistribution {
  [flavor: string]: number;
}

// 食材生成配置
export interface IngredientSpawnConfig {
  maxTier?: number;
  tierWeights: number[];
  flavorDistribution: FlavorDistribution;
}

// 难度缩放配置
export interface DifficultyScaling {
  maxChainCount: number;        // 最大连锁次数限制
  safeSpawnRange: number;       // 安全生成检查范围
  ingredientDiversity: number;  // 食材多样性指数 (0-1)
}

export interface PresetIngredientConfig {
  type: import('./index').IngredientType;
  flavor: import('./index').FlavorType;
}

export interface DebugLevelConfig {
  trackProgress?: boolean;
  hidden?: boolean;
}

// 口味配置（关卡级别）
export interface LevelFlavorConfig {
  available: string[];                    // 可用的口味列表
  distribution: FlavorDistribution;       // 初始分布
  refillBias?: FlavorDistribution;        // 补位时的偏向分布
}

// 关卡配置接口
export interface LevelConfig {
  levelId: number;
  levelName: string;
  description: string;
  unlockCondition: {
    prevLevel: number;
  };
  difficulty: 'tutorial' | 'easy' | 'normal' | 'hard' | 'expert';
  gridSize: {
    rows: number;
    cols: number;
  };
  presetBoard?: PresetIngredientConfig[][];
  customers: {
    totalCount: number;
    basePatience: number;
    queuePatienceOffset: number;
    entryGraceTurns: number;
    demandCountRange: [number, number];
    allowedFlavors: import('./index').FlavorType[];
  };
  starRatings: {
    oneStar: number;
    twoStars: number;
    threeStars: number;
  };
  tutorial?: {
    enabled: boolean;
    steps: string[];
  };
  debug?: DebugLevelConfig;
  // 食材生成配置
  ingredientSpawn?: {
    initial: IngredientSpawnConfig;
    refill: IngredientSpawnConfig;
  };
  // 新：口味配置
  flavors?: LevelFlavorConfig;
  // 新：难度缩放配置
  difficultyScaling?: DifficultyScaling;
}

// 食材链配置项
export interface ChainItem {
  id: string;
  name: string;
  image: string;
}

// 口味配置接口
export interface FlavorConfig {
  flavorId: string;
  flavorName: string;
  unlockLevel: number;
  chain: {
    [key: string]: ChainItem;
  };
  visuals: {
    primaryColor: string;
    secondaryColor: string;
    pattern: string;
  };
}

// 口味集合配置
export interface FlavorsData {
  version: string;
  flavors: FlavorConfig[];
}

// 关卡进度数据
export interface LevelProgressData {
  currentLevel: number;
  unlockedLevels: number[];
  levelStars: Record<number, number>; // levelId -> star count (0-3)
  levelScores: Record<number, number>; // levelId -> best score
}

// 关卡加载结果
export interface LevelLoadResult {
  success: boolean;
  level?: LevelConfig;
  error?: string;
}
