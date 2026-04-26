# 🎯 关卡设计文档

> **文档层级**: 核心设计文档  
> **适用范围**: 关卡系统实现  
> **关联文档**: [game-design.md](./game-design.md), [data-model.md](./data-model.md)  
> **最后更新**: 2026-03-27

---

## 📋 文档导航

- [核心设计原则](#核心设计原则)
- [顾客池机制](#顾客池机制)
- [口味系统](#口味系统)
- [关卡配置结构](#关卡配置结构)
- [难度曲线设计](#难度曲线设计)
- [配置文件示例](#配置文件示例)

---

## 核心设计原则

### 1. 统一食材类型
所有口味共享同一套食材类型，口味作为属性附加：

```
1阶: wheat(小麦) → 2阶: flour(面粉) → 3阶: dough(面团)
→ 4阶: baking(面包坯) → 5阶: toast(吐司) → 6阶: gift(礼盒)
```

### 2. 关卡结束条件

当前版本不再使用“时间结束”作为关卡结束条件。

关卡结算规则：
- **成功结束**: 所有顾客都已结算完毕
- **失败结束**: 棋盘无可移动步骤，且仍有未结算顾客

这里的“已结算完毕”包括两种情况：
- 顾客被成功服务
- 顾客耐心归零后离场

因此本关结果评价由下面三项共同决定：
- 服务顾客数量
- 错过顾客数量
- 金币 / 分数收益

### 3. 顾客池而非实时刷新

顾客不再按时间不断刷新，而是关卡开始时一次性生成固定顾客池：
- 本关共有 `totalCount` 位顾客
- 可视区域最多显示 3 位顾客
- 前台顾客离场或被服务后，后续顾客立即补位

### 4. 回合制耐心消耗

顾客耐心单位从“秒”改为“步”。

规则如下：
- 玩家每完成一次**有效交换**，当前在场顾客全部扣 1 点耐心
- 无效交换回弹不扣耐心
- 道具不扣耐心
- 连锁、补位、动画、老虎机过程都不扣耐心

---

## 顾客池机制

### 固定顾客池

每关开始时生成固定数量顾客：

```typescript
customers: {
  totalCount: number;
  basePatience: number;
  queuePatienceOffset: number;
  entryGraceTurns: number;
  demandCountRange: [number, number];
  allowedFlavors: FlavorType[];
}
```

字段说明：
- `totalCount`: 本关顾客总数
- `basePatience`: 第 1 位顾客的初始耐心
- `queuePatienceOffset`: 排队位置每后移 1 位增加的耐心
- `entryGraceTurns`: 新补位顾客的免扣回合数
- `demandCountRange`: 单顾客需求数量范围
- `allowedFlavors`: 本关顾客允许出现的口味

### 耐心计算公式

顾客进入关卡时的初始耐心按排队顺序计算：

```typescript
patience = basePatience + queuePatienceOffset * queueIndex
```

示例：
```typescript
basePatience = 30
queuePatienceOffset = 24
```

则：
- 第 1 位顾客: 30
- 第 2 位顾客: 54
- 第 3 位顾客: 78

### 入场缓冲

当顾客补位进入前台时：
- 立刻出现在可视区域
- 拥有 `entryGraceTurns = 1` 的免扣
- 只在下一次有效交换时生效

### 顾客离场规则

顾客耐心归零后：
- 立即离场
- 不扣金币
- 不扣分数
- 只会减少这一关的服务率和收益空间

---

## 口味系统

### 口味定义

```typescript
interface FlavorConfig {
  flavorId: string;
  name: string;
  color: string;
  emoji: string;
}
```

### 可用口味

| 口味ID | 名称 | 主题色 | 礼盒emoji |
|--------|------|--------|-----------|
| original | 原味 | #F5DEB3 | 🎁 |
| strawberry | 草莓 | #FFB6C1 | 🎀 |
| matcha | 抹茶 | #8B4513 | 🍫 |

### 口味分布配置

```typescript
interface FlavorDistribution {
  [flavorId: string]: number;
}
```

口味递进示例：
- 第1-3关: `{ original: 100 }`
- 第4-10关: `{ original: 70, matcha: 30 }`
- 第11-20关: `{ original: 50, matcha: 50 }`
- 第21+关: 三种口味混合

---

## 关卡配置结构

### 单关配置

```typescript
interface LevelConfig {
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

  presetBoard?: {
    type: IngredientType;
    flavor: FlavorType;
  }[][];

  flavors: {
    available: FlavorType[];
    distribution: Record<FlavorType, number>;
    refillBias?: Record<FlavorType, number>;
  };

  ingredientSpawn: {
    initial: {
      tierWeights: number[];
      flavorDistribution: Record<FlavorType, number>;
    };
    refill: {
      tierWeights: number[];
      flavorDistribution: Record<FlavorType, number>;
    };
  };

  customers: {
    totalCount: number;
    basePatience: number;
    queuePatienceOffset: number;
    entryGraceTurns: number;
    demandCountRange: [number, number];
    allowedFlavors: FlavorType[];
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

  debug?: {
    trackProgress?: boolean;
    hidden?: boolean;
  };

  difficultyScaling?: {
    maxChainCount: number;
    safeSpawnRange: number;
    ingredientDiversity: number;
  };
}
```

### 已废弃字段

以下旧字段已退出当前模型：
- `objective`
- `customers.maxConcurrent`
- `customers.spawnInterval`
- `customers.patienceBase`
- `customers.orderComplexity`
- `limits`

---

## 难度曲线设计

### 难度维度

1. **棋盘大小**: 5×5 → 6×6 → 7×7
2. **口味数量**: 1种 → 2种 → 3种
3. **顾客总数**: 1 → 3 → 4 → 8
4. **顾客需求范围**: `[1,2]` → `[1,3]` → `[2,3]`
5. **首位耐心**: 宽松 → 普通 → 紧张
6. **排队耐心增量**: 小幅增加 → 中幅增加

### 推荐节奏

| 关卡区间 | 棋盘 | 口味 | 顾客池 | 特点 |
|---------|------|------|--------|------|
| 1-3 | 5×5 | 原味 | 1-2人 | 教学，理解顾客结算 |
| 4-10 | 5×5 / 6×6 | 原味+抹茶 | 2-3人 | 学习排队和补位 |
| 11-20 | 6×6 / 7×7 | 双口味 | 3-4人 | 中期稳定经营 |
| 21-30 | 7×7 | 三口味 | 4-6人 | 三口味和老虎机 |
| 31-50 | 7×7 | 三口味 | 6-8人 | 更高密度的顾客管理 |

---

## 配置文件示例

### 教学关示例

```json
{
  "levelId": 1,
  "levelName": "第一炉吐司",
  "description": "学习服务顾客的基础节奏。",
  "unlockCondition": { "prevLevel": 0 },
  "difficulty": "tutorial",
  "gridSize": { "rows": 5, "cols": 5 },
  "flavors": {
    "available": ["original"],
    "distribution": { "original": 100 },
    "refillBias": { "original": 100 }
  },
  "ingredientSpawn": {
    "initial": {
      "tierWeights": [50, 30, 15, 5, 0],
      "flavorDistribution": { "original": 100 }
    },
    "refill": {
      "tierWeights": [40, 35, 20, 5, 0],
      "flavorDistribution": { "original": 100 }
    }
  },
  "customers": {
    "totalCount": 4,
    "basePatience": 30,
    "queuePatienceOffset": 24,
    "entryGraceTurns": 1,
    "demandCountRange": [1, 2],
    "allowedFlavors": ["original"]
  },
  "starRatings": {
    "oneStar": 200,
    "twoStars": 500,
    "threeStars": 900
  }
}
```

### 中期关示例

```json
{
  "levelId": 12,
  "levelName": "午后高峰",
  "description": "同时处理多位顾客的不同需求。",
  "unlockCondition": { "prevLevel": 11 },
  "difficulty": "normal",
  "gridSize": { "rows": 6, "cols": 6 },
  "flavors": {
    "available": ["original", "matcha"],
    "distribution": { "original": 55, "matcha": 45 },
    "refillBias": { "original": 50, "matcha": 50 }
  },
  "ingredientSpawn": {
    "initial": {
      "tierWeights": [40, 30, 20, 8, 2],
      "flavorDistribution": { "original": 55, "matcha": 45 }
    },
    "refill": {
      "tierWeights": [38, 30, 22, 8, 2],
      "flavorDistribution": { "original": 50, "matcha": 50 }
    }
  },
  "customers": {
    "totalCount": 8,
    "basePatience": 28,
    "queuePatienceOffset": 20,
    "entryGraceTurns": 1,
    "demandCountRange": [1, 3],
    "allowedFlavors": ["original", "matcha"]
  },
  "starRatings": {
    "oneStar": 1500,
    "twoStars": 3000,
    "threeStars": 5000
  }
}
```

---

*最后更新: 2026-03-27*
