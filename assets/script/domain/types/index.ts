/**
 * Toast N Roll - 类型定义总入口
 * 导出所有游戏相关的类型定义
 */

// ========== 食材类型 ==========

export type IngredientTier = 1 | 2 | 3 | 4 | 5 | 6;

export type IngredientType =
    | 'wheat'    // 1阶: 小麦
    | 'flour'    // 2阶: 面粉
    | 'dough'    // 3阶: 面团
    | 'baking'   // 4阶: 面包坯
    | 'toast'    // 5阶: 吐司面包
    | 'gift';    // 6阶: 吐司礼盒

export type FlavorType = 'original' | 'matcha' | 'strawberry';

export interface Ingredient {
    id: string;
    tier: IngredientTier;
    type: IngredientType;
    flavor: FlavorType;
    image: string;  // 图片路径
    name: string;
}

// ========== 格子类型 ==========

export interface GridPosition {
    row: number;    // 0-6
    col: number;    // 0-6
}

export interface Cell {
    position: GridPosition;
    ingredient: Ingredient | null;
    isSelected: boolean;
    isMatched: boolean;
}

// ========== 顾客类型 ==========

export interface CustomerDemand {
    type: FlavorType;
    count: number;
}

export interface Customer {
    id: string;
    avatar: string;
    demand: CustomerDemand;
    patience: number;
    maxPatience: number;
    reward: number;
}

// ========== 道具类型 ==========

export type PropType = 'remove' | 'shuffle' | 'magnet';

export interface Prop {
    type: PropType;
    icon: string;
    name: string;
    count: number;
}

// 道具解锁状态（看广告后解锁使用权限）
export interface PropUnlockStatus {
    remove: boolean;
    shuffle: boolean;
    magnet: boolean;
}

// ========== 游戏状态类型 ==========

export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameOver' | 'levelComplete';

export interface GameState {
    phase: GamePhase;
    score: number;
    coins: number;
    level: number;
    grid: Cell[][];
    customers: Customer[];
    props: {
        remove: number;
        shuffle: number;
        magnet: number;
        unlockStatus: PropUnlockStatus;
    };
}

// ========== 动画类型 ==========

export type AnimationType = 'swap' | 'rise' | 'disappear' | 'merge';

export interface Animation {
    id: string;
    type: AnimationType;
    startTime: number;
    duration: number;
    from: GridPosition;
    to: GridPosition;
    fromPixel?: { x: number; y: number };
    toPixel?: { x: number; y: number };
    progress: number;
    onComplete?: () => void;
}

// ========== 事件类型 ==========

export type GameEventType =
    | 'INGREDIENT_SELECTED'
    | 'INGREDIENT_SWAPPED'
    | 'MATCH_FOUND'
    | 'INGREDIENT_MERGED'
    | 'CUSTOMER_SERVED'
    | 'PROP_USED'
    | 'PROP_ACQUIRED'
    | 'PROP_AD_COMPLETED'
    | 'PROP_REMOVE_USED'
    | 'PROP_SHUFFLE_USED'
    | 'PROP_MAGNET_USED'
    | 'INGREDIENT_SELECTED_FOR_REMOVE'
    | 'INGREDIENT_SELECTED_FOR_MAGNET'
    | 'AD_STARTED'
    | 'AD_COMPLETED'
    | 'GAME_OVER'
    | 'LEVEL_COMPLETE';

export interface GameEvent {
    type: GameEventType;
    payload?: unknown;
}

// ========== 广告类型 ==========

export type AdType = 'remove' | 'shuffle' | 'magnet' | 'reroll' | 'revive';

export interface AdResult {
    success: boolean;
    skipped: boolean;
    reward?: {
        type: string;
        value: number;
    };
}

// ========== 存档类型 ==========

export interface GameSave {
    version: string;
    timestamp: number;
    progress: {
        currentLevel: number;
        unlockedLevels: number[];
        levelStars: Record<number, number>;
        levelScores: Record<number, number>;
        totalCoins: number;
        totalGifts: number;
    };
    inventory: {
        remove: number;
        shuffle: number;
        magnet: number;
        unlockStatus: PropUnlockStatus;
    };
    achievements: string[];
    settings: {
        musicEnabled: boolean;
        sfxEnabled: boolean;
        vibrationEnabled: boolean;
    };
}

// ========== 关卡类型 ==========

export type {
    LevelConfig,
    FlavorConfig,
    FlavorsData,
    LevelProgressData,
    LevelLoadResult
} from './level';

// ========== 常量 ==========

export const GRID_SIZE = 7;
export const CELL_SIZE = 90;  
export const CELL_GAP = 0; 
export const GRID_PADDING = 0;

export const DESIGN = {
    width: 720,
    height: 1280,
    topPanelHeight: 240,
    gameAreaHeight: 920,
    bottomPanelHeight: 120,
} as const;

// 道具按钮常量
export const PROP_BUTTON = {
    y: DESIGN.topPanelHeight + DESIGN.gameAreaHeight + 15,
    width: 90,
    height: 90,
    gap: 30,
    count: 3,
} as const;

export const COLORS = {
    primary: '#4CAF50',
    secondary: '#FF9800',
    accent: '#FFD700',
    bgTop: '#FFF8E1',
    bgGame: '#FFFFFF',
    bgBottom: '#F5F5F5',
    text: '#333333',
    textLight: '#666666',
    border: '#E0E0E0',
} as const;

export const SPAWN_RATES: Record<IngredientType, number> = {
    wheat: 0.50,
    flour: 0.30,
    dough: 0.15,
    baking: 0.05,
    toast: 0,
    gift: 0,
};

export const GIFT_VALUES: Record<FlavorType, number> = {
    original: 100,
    matcha: 120,
    strawberry: 150,
};

export const INGREDIENT_IMAGES: Record<IngredientType, string> = {
    wheat: '/assets/ingredients/block_wheat_original.png',
    flour: '/assets/ingredients/block_flour_original.png',
    dough: '/assets/ingredients/block_dough_original.png',
    baking: '/assets/ingredients/block_bread_original.png',
    toast: '/assets/ingredients/block_toast_original.png',
    gift: '/assets/ingredients/block_gift_original.png',
};

export const INGREDIENT_IMAGES_BY_FLAVOR: Record<FlavorType, Record<IngredientType, string>> = {
    original: {
        wheat: '/assets/ingredients/block_wheat_original.png',
        flour: '/assets/ingredients/block_flour_original.png',
        dough: '/assets/ingredients/block_dough_original.png',
        baking: '/assets/ingredients/block_bread_original.png',
        toast: '/assets/ingredients/block_toast_original.png',
        gift: '/assets/ingredients/block_gift_original.png',
    },
    matcha: {
        wheat: '/assets/ingredients/block_wheat_matcha.png',
        flour: '/assets/ingredients/block_flour_matcha.png',
        dough: '/assets/ingredients/block_dough_matcha.png',
        baking: '/assets/ingredients/block_bread_matcha.png',
        toast: '/assets/ingredients/block_toast_matcha.png',
        gift: '/assets/ingredients/block_gift_matcha.png',
    },
    strawberry: {
        wheat: '/assets/ingredients/block_wheat_strawberry.png',
        flour: '/assets/ingredients/block_flour_strawberry.png',
        dough: '/assets/ingredients/block_dough_strawberry.png',
        baking: '/assets/ingredients/block_bread_strawberry.png',
        toast: '/assets/ingredients/block_toast_strawberry.png',
        gift: '/assets/ingredients/block_gift_strawberry.png',
    },
};

export const INGREDIENT_NAMES: Record<IngredientType, string> = {
    wheat: '小麦',
    flour: '面粉',
    dough: '面团',
    baking: '面包坯',
    toast: '吐司面包',
    gift: '吐司礼盒',
};

export const FLAVOR_COLORS: Record<FlavorType, string> = {
    original: '#FFD700',
    matcha: '#90EE90',
    strawberry: '#FFB6C1',
};

// ========== 工具函数 ==========

export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ========== 随机工具函数 ==========

export function randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function randomIngredientType(): IngredientType {
    const types: IngredientType[] = ['wheat', 'flour'];
    const weights = [0.65, 0.35];
    const random = Math.random();
    let sum = 0;
    for (let i = 0; i < types.length; i++) {
        sum += weights[i];
        if (random < sum) return types[i];
    }
    return 'wheat';
}

export function randomFlavor(): FlavorType {
    const flavors: FlavorType[] = ['original', 'matcha', 'strawberry'];
    return randomPick(flavors);
}

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
        '/assets/customers/figma/honeybadger.png'
    ];
    return randomPick(avatars);
}

export function randomDemandCount(): number {
    return Math.floor(Math.random() * 3) + 1; // 1-3
}
