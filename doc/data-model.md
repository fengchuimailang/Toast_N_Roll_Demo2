# 📊 数据模型文档

> 🏷️ **版本**: v1.0  
> 📅 **创建日期**: 2026-03-05  
> 📝 **状态**: ✅ 已完成  
> 🎯 **适用范围**: Toast N Roll 游戏数据结构设计

---

## 📋 目录

1. [🎯 模型概览](#-模型概览)
2. [🍞 核心实体](#-核心实体)
3. [📐 游戏板模型](#-游戏板模型)
4. [👤 顾客模型](#-顾客模型)
5. [🎁 道具模型](#-道具模型)
6. [🏆 进度模型](#-进度模型)
7. [📡 事件模型](#-事件模型)
8. [💾 存档模型](#-存档模型)
9. [🔗 关系图](#-关系图)

---

## 🎯 模型概览

### 📊 实体关系概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        核心实体关系                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐         ┌──────────────┐                    │
│   │   🎮 Game    │◄───────►│   🍞 Board   │                    │
│   │    State     │         │    State     │                    │
│   └──────┬───────┘         └──────┬───────┘                    │
│          │                        │                            │
│          │    ┌───────────────────┘                            │
│          │    │                                                 │
│          ▼    ▼                                                 │
│   ┌──────────────┐         ┌──────────────┐                    │
│   │   👤 Customer│         │  🌾 Ingredient│                    │
│   │    State     │         │    State      │                    │
│   └──────────────┘         └──────────────┘                    │
│          │                        │                            │
│          └────────────┬───────────┘                            │
│                       │                                         │
│                       ▼                                         │
│   ┌──────────────┐         ┌──────────────┐                    │
│   │   🦝 Raccoon │         │   🎁 Item    │                    │
│   │    Event     │         │   Inventory  │                    │
│   └──────────────┘         └──────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🍞 核心实体

### 🌾 食材类型 (IngredientType)

```typescript
/**
 * 食材阶数枚举
 * 严格6阶进阶链
 */
enum IngredientTier {
  TIER_1_WHEAT = 1,      // 🌾 小麦
  TIER_2_FLOUR = 2,      // 🥡 面粉
  TIER_3_DOUGH = 3,      // 🍥 面团
  TIER_4_BREAD = 4,      // 🥖 面包坯
  TIER_5_TOAST = 5,      // 🍞 吐司面包
  TIER_6_GIFT = 6,       // 🎁 吐司礼盒 (最高阶)
}

/**
 * 口味类型枚举
 */
enum FlavorType {
  ORIGINAL = 'original',   // 🥛 原味
  MATCHA = 'matcha',       // 🍵 抹茶
  STRAWBERRY = 'strawberry', // 🍓 草莓
}

/**
 * 食材唯一标识符
 * 格式: {tier}_{flavor}_{uuid}
 * 示例: "3_matcha_a1b2c3d4"
 */
type IngredientId = string;

/**
 * 食材实体接口
 */
interface Ingredient {
  id: IngredientId;
  tier: IngredientTier;
  flavor: FlavorType;
  
  // 视觉属性
  sprite: string;         // 精灵图资源路径
  color: string;          // 主题色 (hex)
  
  // 游戏属性
  isLocked: boolean;      // 是否被锁定 (冰冻等)
  isGiftBox: boolean;     // 是否为礼盒 (tier 6)
}
```

### 📋 食材配置表

| 阶数 | 名称 | 图标 | 合成需求 | 基础价值 | 颜色 |
|------|------|------|----------|----------|------|
| 1 | 🌾 小麦 | 🌾 | - | 10 | #F4D03F |
| 2 | 🥡 面粉 | 🥡 | 3×小麦 | 30 | #FDFEFE |
| 3 | 🍥 面团 | 🍥 | 3×面粉 | 90 | #F5CBA7 |
| 4 | 🥖 面包坯 | 🥖 | 3×面团 | 270 | #D35400 |
| 5 | 🍞 吐司 | 🍞 | 3×面包坯 | 810 | #E67E22 |
| 6 | 🎁 礼盒 | 🎁 | 3×吐司 | 2430 | #E91E63 |

### 🎨 口味配置表

| 口味 | 图标 | 基础色 | 礼盒价值倍率 | 出现权重 |
|------|------|--------|--------------|----------|
| 🥛 原味 | 🥛 | #FFF8E1 | 1.0× | 60% |
| 🍵 抹茶 | 🍵 | #C8E6C9 | 2.0× | 30% |
| 🍓 草莓 | 🍓 | #FFCDD2 | 4.0× | 10% |

---

## 📐 游戏板模型

### ⬜ 格子位置 (GridPosition)

```typescript
/**
 * 格子坐标
 * 原点 (0,0) 在左上角
 * x: 列索引 (0 ~ width-1)
 * y: 行索引 (0 ~ height-1)
 */
interface GridPosition {
  x: number;
  y: number;
}

/**
 * 格子大小配置
 */
interface GridSize {
  width: number;   // 列数
  height: number;  // 行数
}

// 预设关卡大小
const GRID_SIZES: Record<string, GridSize> = {
  TUTORIAL_1: { width: 3, height: 2 },
  TUTORIAL_2: { width: 3, height: 3 },
  TUTORIAL_3: { width: 4, height: 4 },
  LEVEL_1:    { width: 5, height: 5 },
  LEVEL_2:    { width: 6, height: 6 },
  LEVEL_3:    { width: 7, height: 7 }, // 最大格子
};
```

### 🎲 游戏板状态 (BoardState)

```typescript
/**
 * 单个格子状态
 */
interface Cell {
  position: GridPosition;
  ingredient: Ingredient | null;  // null 表示空位
  isEmpty: boolean;
}

/**
 * 游戏板完整状态
 */
interface BoardState {
  id: string;
  size: GridSize;
  cells: Cell[][];  // 二维数组 [y][x]
  
  // 统计信息
  stats: {
    emptyCount: number;
    ingredientCounts: Record<IngredientTier, number>;
  };
}

/**
 * 单个匹配组结果
 */
interface MatchGroup {
  matchedPositions: GridPosition[];  // 匹配的格子位置
  tier: IngredientTier;              // 匹配的食材阶数
  flavor: FlavorType;                // 主导口味
  mergeTarget: GridPosition;         // 当前匹配组的合成目标位置
}

/**
 * 当前轮匹配结果
 */
interface MatchResult {
  matchedPositions: GridPosition[];  // 当前轮所有要消除的格子
  groups: MatchGroup[];              // 当前轮内需要同时结算的匹配组
}

/**
 * 交换操作结果
 */
interface SwapResult {
  success: boolean;
  from: GridPosition;
  to: GridPosition;
  matches: MatchGroup[];
  cascades: MatchGroup[][];   // 连锁反应，每轮由多个匹配组组成
}
```

### 🔄 游戏板操作

```typescript
interface BoardOperations {
  // 基础操作
  getCell(pos: GridPosition): Cell | null;
  setCell(pos: GridPosition, ingredient: Ingredient | null): void;
  
  // 交换操作
  canSwap(from: GridPosition, to: GridPosition): boolean;
  swap(from: GridPosition, to: GridPosition): SwapResult;
  
  // 检测操作
  findMatches(): MatchResult[];
  hasValidMoves(): boolean;
  getHint(): [GridPosition, GridPosition] | null;
  
  // 补位操作
  fillEmptyCells(): Ingredient[];  // 返回新生成的食材
  applyGravity(): void;            // 应用重力下落
}
```

---

## 👤 顾客模型

### 👥 顾客池模型

```typescript
interface Customer {
  id: string;
  avatar: string;
  demand: {
    type: FlavorType;
    count: number;
  };
  patience: number;              // 按步结算
  maxPatience: number;
  reward: number;
  graceTurnsRemaining: number;   // 新上场顾客免扣回合数
  queueIndex: number;            // 在固定顾客池中的顺序
}

interface CustomerSystemConfig {
  totalCount: number;
  basePatience: number;
  queuePatienceOffset: number;
  entryGraceTurns: number;
  demandCountRange: [number, number];
  allowedFlavors: FlavorType[];
}

interface CustomerRuntimeStats {
  totalCustomers: number;
  servedCustomers: number;
  missedCustomers: number;
  remainingCustomers: number;
}
```

### 顾客结算规则

- 关卡开始时一次性生成固定顾客池
- 屏幕前台最多展示 3 位顾客
- 每次有效交换后，前台顾客统一扣 1 点耐心
- 顾客耐心归零后离场，不产生额外惩罚
- 当前台顾客离场或被服务后，后续顾客立即补位
- 新补位顾客拥有 `entryGraceTurns = 1` 的免扣

### 顾客难度曲线

| 关卡进度 | 顾客总数 | 需求范围 | 首位耐心 | 排队耐心增量 |
|----------|----------|----------|----------|--------------|
| 教学阶段 | 1-2 | 1-2 | 很宽松 | 低 |
| 初期 | 2-3 | 1-2 | 宽松 | 中 |
| 中期 | 3-4 | 1-3 | 普通 | 中 |
| 后期 | 4-8 | 2-3 | 紧张 | 中高 |

---

## 🎁 道具模型

### 🧰 道具类型 (ItemType)

```typescript
/**
 * 道具类型枚举
 */
enum ItemType {
  REMOVE = 'remove',           // 🗑️ 去除
  SHUFFLE = 'shuffle',         // 🔀 洗牌
  MAGNET = 'magnet',           // 🧲 磁力
  FLAVOR_SYNC = 'flavor_sync', // 🍯 同化酱
  UPGRADE = 'upgrade',         // ⬆️ 升级
}

/**
 * 道具定义
 */
interface Item {
  type: ItemType;
  name: string;
  icon: string;
  description: string;
  maxStack: number;
}

/**
 * 道具效果定义
 */
interface ItemEffect {
  type: ItemType;
  
  // 效果参数
  target?: GridPosition;
  sourceIngredient?: Ingredient;
  
  // 执行结果
  execute(): boolean;
  canUse(): boolean;
}

/**
 * 玩家背包
 */
interface Inventory {
  items: Record<ItemType, number>;  // 各道具数量
  
  addItem(type: ItemType, count: number): void;
  removeItem(type: ItemType, count: number): boolean;
  getCount(type: ItemType): number;
}
```

### 📋 道具配置

| 道具 | 图标 | 效果 | 使用限制 | 最大堆叠 |
|------|------|------|----------|----------|
| 🗑️ 去除 | 🗑️ | 清除任意1个食材 | 不占用步数 | 99 |
| 🔀 洗牌 | 🔀 | 打乱所有食材位置 | 保留阶数/口味 | 99 |
| 🧲 磁力 | 🧲 | 吸附2个同阶食材合成 | 不可对礼盒使用 | 99 |
| 🍯 同化酱 | 🍯 | 周围8格同阶同化口味 | - | 99 |
| ⬆️ 升级 | ⬆️ | 选中食材升1阶 | 100%继承口味 | 99 |

---

## 🏆 进度模型

### 📈 玩家进度 (PlayerProgress)

```typescript
/**
 * 关卡解锁状态
 */
interface LevelUnlock {
  levelId: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  highScore: number;
  bestTime: number;
}

/**
 * 成就定义
 */
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  reward?: ItemType;
}

/**
 * 成就条件类型
 */
type AchievementCondition =
  | { type: 'total_gifts'; count: number }
  | { type: 'total_coins'; count: number }
  | { type: 'combo_count'; count: number }
  | { type: 'level_unlock'; levelId: string }
  | { type: 'flavor_gifts'; flavor: FlavorType; count: number };

/**
 * 玩家进度数据
 */
interface PlayerProgress {
  // 基础信息
  playerId: string;
  createdAt: number;
  lastPlayedAt: number;
  
  // 货币
  coins: number;
  totalCoinsEarned: number;
  
  // 关卡进度
  levels: LevelUnlock[];
  currentLevelId: string;
  
  // 成就
  achievements: string[];  // 已解锁成就ID列表
  achievementProgress: Record<string, number>;
  
  // 统计
  stats: PlayerStats;
}

/**
 * 玩家统计
 */
interface PlayerStats {
  totalGames: number;
  totalGiftsCrafted: number;
  totalCustomersServed: number;
  highestCombo: number;
  longestChain: number;
  favoriteFlavor: FlavorType;
}
```

---

## 📡 事件模型

### 🎮 游戏事件 (GameEvent)

```typescript
/**
 * 基础事件接口
 */
interface GameEvent<T = unknown> {
  type: string;
  timestamp: number;
  data: T;
}

/**
 * 食材交换事件
 */
interface IngredientSwapEvent extends GameEvent {
  type: 'INGREDIENT_SWAP';
  data: {
    from: GridPosition;
    to: GridPosition;
    ingredientA: Ingredient;
    ingredientB: Ingredient;
  };
}

/**
 * 食材合成事件
 */
interface IngredientMergeEvent extends GameEvent {
  type: 'INGREDIENT_MERGE';
  data: {
    positions: GridPosition[];
    sourceTier: IngredientTier;
    result: Ingredient;
    isCascade: boolean;
  };
}

/**
 * 顾客完成事件
 */
interface CustomerFulfillEvent extends GameEvent {
  type: 'CUSTOMER_FULFILL';
  data: {
    customerId: string;
    rewards: {
      coins: number;
      items?: ItemType[];
    };
  };
}

/**
 * 小浣熊事件
 */
interface RaccoonEvent extends GameEvent {
  type: 'RACCOON_APPEAR' | 'RACCOON_TAP' | 'RACCOON_FLEE' | 'RACCOON_STEAL';
  data: {
    raccoonId: string;
    position?: GridPosition;
    stolenGift?: Ingredient;
    tapCount?: number;
  };
}

/**
 * 游戏状态事件
 */
interface GameStateEvent extends GameEvent {
  type: 'GAME_START' | 'GAME_PAUSE' | 'GAME_RESUME' | 'GAME_OVER' | 'LEVEL_COMPLETE';
  data: {
    levelId?: string;
    score?: number;
    reason?: string;
  };
}
```

---

## 💾 存档模型

### 💽 完整存档结构

```typescript
/**
 * 存档版本管理
 */
interface SaveVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * 完整游戏存档
 */
interface GameSave {
  // 元数据
  version: SaveVersion;
  timestamp: number;
  checksum: string;
  
  // 玩家进度
  progress: PlayerProgress;
  
  // 当前游戏 (进行中时存在)
  currentGame?: {
    levelId: string;
    board: BoardState;
    customers: CustomerQueue;
    inventory: Inventory;
    score: number;
    startTime: number;
  };
  
  // 设置
  settings: GameSettings;
}

/**
 * 游戏设置
 */
interface GameSettings {
  // 音频
  musicVolume: number;    // 0-1
  sfxVolume: number;      // 0-1
  
  // 游戏
  showHints: boolean;
  enableAnimations: boolean;
  
  // 进度
  tutorialCompleted: boolean;
  firstLaunch: boolean;
}

/**
 * 存档序列化
 */
interface SaveSerializer {
  serialize(save: GameSave): string;
  deserialize(data: string): GameSave | null;
  validate(save: GameSave): boolean;
}
```

### 📦 存档版本历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0.0 | 2026-03-05 | 初始版本 |

---

## 🔗 关系图

### 📊 ER 图

```
┌─────────────────┐       ┌─────────────────┐
│   🎮 GameSave    │       │  📈 PlayerProgress│
├─────────────────┤       ├─────────────────┤
│ PK version      │◄─────►│ PK playerId      │
│    timestamp    │       │    coins         │
│    checksum     │       │    totalCoins    │
│ FK progress     │       │    stats         │
│ FK currentGame  │       └─────────────────┘
│ FK settings     │              │
└─────────────────┘              │
       │                         │
       │    ┌────────────────────┘
       │    │
       ▼    ▼
┌─────────────────┐       ┌─────────────────┐
│ 🎲 CurrentGame   │       │  🏆 LevelUnlock  │
├─────────────────┤       ├─────────────────┤
│ PK levelId      │◄─────►│ PK levelId       │
│ FK board        │       │    isUnlocked    │
│ FK customers    │       │    isCompleted   │
│ FK inventory    │       │    highScore     │
│    score        │       └─────────────────┘
│    startTime    │
└─────────────────┘
       │
       │    ┌─────────────────────────────────────┐
       │    │                                     │
       ▼    ▼                                     ▼
┌─────────────────┐       ┌─────────────────┐  ┌─────────────────┐
│   🍞 BoardState  │       │  👤 CustomerQueue│  │  🎁 Inventory    │
├─────────────────┤       ├─────────────────┤  ├─────────────────┤
│ PK id           │       │    maxSize      │  │    items        │
│    size         │       │ FK customers[]  │  └─────────────────┘
│ FK cells[][]    │       └─────────────────┘
│    stats        │
└─────────────────┘              │
       │                         │
       │    ┌────────────────────┘
       ▼    ▼
┌─────────────────┐       ┌─────────────────┐
│     ⬜ Cell      │       │   👤 Customer    │
├─────────────────┤       ├─────────────────┤
│ PK position     │◄─────►│ PK id           │
│ FK ingredient   │       │    avatar       │
│    isEmpty      │       │    name         │
└─────────────────┘       │    demands[]    │
       │                  │    patience     │
       │                  │    reward       │
       ▼                  └─────────────────┘
┌─────────────────┐
│ 🌾 Ingredient    │
├─────────────────┤
│ PK id           │
│    tier         │
│    flavor       │
│    sprite       │
│    color        │
│    isLocked     │
│    isGiftBox    │
└─────────────────┘
```

### 🔄 状态流转图

```
┌─────────────┐     swap      ┌─────────────┐
│   IDLE      │──────────────►│  SWAPPING   │
│  (等待输入)  │               │  (交换动画)  │
└─────────────┘               └──────┬──────┘
       ▲                             │
       │                             │ match?
       │                             ▼
       │                      ┌─────────────┐
       │                      │   CHECKING  │
       │                      │  (检测匹配)  │
       │                      └──────┬──────┘
       │                             │
       │                    ┌────────┴────────┐
       │                    │                 │
       │                    ▼                 ▼
       │               ┌─────────┐      ┌─────────┐
       │               │  MATCH  │      │ NO MATCH│
       │               │  (有匹配) │      │ (无匹配) │
       │               └────┬────┘      └────┬────┘
       │                    │                 │
       │                    ▼                 │
       │               ┌─────────┐            │
       │               │ MERGING │            │
       │               │ (合成动画) │          │
       │               └────┬────┘            │
       │                    │                 │
       │                    ▼                 │
       │               ┌─────────┐            │
       │               │ FALLING │◄───────────┘
       │               │ (下落补位) │
       │               └────┬────┘
       │                    │
       └────────────────────┘
                    cascade?
```

---

*本文档为Brainstorm阶段产出，数据模型可能根据实现情况调整*
