# 📐 格子系统与补位逻辑文档

> 🏷️ **版本**: v2.0  
> 📅 **更新日期**: 2026-03-17  
> 📝 **状态**: ✅ 已完成  
> 🎯 **适用范围**: Toast N Roll 游戏格子系统与补位机制

---

## 📋 目录

1. [🎯 坐标系统](#-坐标系统)
2. [📐 格子结构](#-格子结构)
3. [⬆️ 上浮补位逻辑](#️-上浮补位逻辑)
4. [🛡️ 安全生成机制](#️-安全生成机制)
5. [🎬 动画系统](#-动画系统)
6. [⚠️ 关键约束](#️-关键约束)

---

## 🎯 坐标系统

### 坐标定义

```
列(col): 0    1    2    3    4    5    6
        ┌────┬────┬────┬────┬────┬────┬────┐
行 0    │ 🌾 │ 🥡 │ 🌾 │ 🥡 │ 🌾 │ 🌾 │ 🥡 │  ← 顶部 (row=0)
        ├────┼────┼────┼────┼────┼────┼────┤
行 1    │ 🥡 │ 🌾 │ 🌾 │ 🥡 │ 🌾 │ 🥡 │ 🌾 │
        ├────┼────┼────┼────┼────┼────┼────┤
行 2    │ 🌾 │ 🌾 │ 🥡 │ 🌾 │ 🥡 │ 🌾 │ 🥡 │
        ├────┼────┼────┼────┼────┼────┼────┤
行 3    │ 🥡 │ 🌾 │ 🌾 │ 🌾 │ 🌾 │ 🥡 │ 🌾 │
        ├────┼────┼────┼────┼────┼────┼────┤
行 4    │ 🌾 │ 🥡 │ 🌾 │ 🥡 │ 🌾 │ 🌾 │ 🥡 │
        ├────┼────┼────┼────┼────┼────┼────┤
行 5    │ 🥡 │ 🌾 │ 🥡 │ 🌾 │ 🥡 │ 🌾 │ 🌾 │
        ├────┼────┼────┼────┼────┼────┼────┤
行 6    │ 🌾 │ 🥡 │ 🌾 │ 🥡 │ 🌾 │ 🥡 │ 🌾 │  ← 底部 (row=6)
        └────┴────┴────┴────┴────┴────┴────┘
```

### 像素坐标计算

```typescript
// 格子像素位置计算
function getCellPixelPosition(row: number, col: number): { x: number; y: number } {
  const x = GRID_PADDING + col * (CELL_SIZE + CELL_GAP);
  const y = DESIGN.topPanelHeight + GRID_PADDING + row * (CELL_SIZE + CELL_GAP);
  return { x, y };
}

// 说明：
// - row 越大，y 越大（越靠下）
// - col 越大，x 越大（越靠右）
// - row=0 在屏幕上方，row=6 在屏幕下方
```

---

## 📐 格子结构

### Cell 接口

```typescript
interface Cell {
  position: GridPosition;    // 格子位置 { row, col }
  ingredient: Ingredient | null;  // 格子中的食材
  isSelected: boolean;       // 是否被选中
  isMatched: boolean;        // 是否处于匹配状态（用于动画）
}
```

### GameBoard 类核心方法

```typescript
class GameBoard {
  // 获取整个网格
  getAllCells(): Cell[][];
  
  // 获取指定格子
  getCell(row: number, col: number): Cell | null;
  
  // 获取格子中的食材
  getIngredient(row: number, col: number): Ingredient | null;
  
  // 设置格子内容
  setIngredient(row: number, col: number, ingredient: Ingredient | null): void;
  
  // 交换两个格子的食材
  swapIngredients(pos1: GridPosition, pos2: GridPosition): boolean;
  
  // 移除食材（设为null）
  removeIngredient(row: number, col: number): Ingredient | null;
  
  // 设置选中状态
  setSelected(row: number, col: number, selected: boolean): void;
  
  // 执行补位（上浮和生成新食材）
  fillEmptyCells(): void;
  
  // 检查是否有空格
  hasEmptyCells(): boolean;
  
  // 检查格子是否满
  isFull(): boolean;
  
  // 洗牌（重新排列所有食材）
  shuffle(): void;
}
```

---

## ⬆️ 上浮补位逻辑

### 核心规则

**⚠️ 重要：实际实现使用上浮补位，食材从底部向上浮动！**

匹配消除后，从顶部向下检查空格，下方食材上浮填补，底部生成新食材。

```
匹配消除后：
┌────┬────┬────┐
│    │ 🥡 │    │  ← 第0行 (顶部) 有空格
├────┼────┼────┤
│ 🌾 │    │ 🥡 │  ← 第1行 有空格
├────┼────┼────┤
│ 🥡 │ 🌾 │    │  ← 第2行 有空格
├────┼────┼────┤
│ 🌾 │ 🥡 │ 🌾 │  ← 第3行
├────┼────┼────┤
│ 🥡 │ 🌾 │ 🥡 │  ← 第4行
├────┼────┼────┤
│ 🌾 │ 🥡 │ 🌾 │  ← 第5行
├────┼────┼────┤
│ 🥡 │ 🌾 │ 🥡 │  ← 第6行 (底部)
└────┴────┴────┘

上浮过程：
1. 从顶部(row=0)向下扫描空格
2. 发现空格后，从下方最近的食材上浮填补
3. 如果下方没有食材，在底部(row=6下方)生成新食材上浮

执行结果：
┌────┬────┬────┐
│ 🌾 │ 🥡 │ 🥡 │  ← 第3行的🌾上浮到第0行
├────┼────┼────┤
│ 🥡 │ 🌾 │ 🌾 │  ← 第4行的🥡上浮到第1行，第5行的🌾上浮到第1行
├────┼────┼────┤
│ 🌾 │ 🥡 │ 🥡 │  ← 第5行的🥡上浮到第2行
├────┼────┼────┤
│ 🥡 │ 🌾 │ 🌾 │  ← 第6行的🥡上浮到第3行
├────┼────┼────┤
│ 🌾 │ 🥡 │ 🥡 │  ← 新生成的食材从底部进入
├────┼────┼────┤
│ 🥡 │ 🌾 │ 🌾 │  ← 新生成的食材从底部进入
├────┼────┼────┤
│ 🆕 │ 🆕 │ 🆕 │  ← 底部生成新食材
└────┴────┴────┘
```

### 实现代码

```typescript
/**
 * 执行补位（食材上浮和生成新食材）
 */
fillEmptyCells(): void {
  for (let col = 0; col < GRID_SIZE; col++) {
    this.fillColumn(col);
  }
}

/**
 * 补位单列 - 上浮补位
 * 核心逻辑：
 * 1. 从顶部(row=0)向下扫描空格
 * 2. 找到空位后，从下方最近的食材上浮填补
 * 3. 如果下方没有食材，生成新食材（使用安全生成机制）
 */
private fillColumn(col: number): void {
  // 从上往下检查空格
  for (let row = 0; row < GRID_SIZE; row++) {
    if (this.grid[row][col].ingredient === null) {
      // 查找下方最近的食材
      let found = false;
      for (let belowRow = row + 1; belowRow < GRID_SIZE; belowRow++) {
        if (this.grid[belowRow][col].ingredient !== null) {
          // 上浮
          this.grid[row][col].ingredient = this.grid[belowRow][col].ingredient;
          this.grid[belowRow][col].ingredient = null;
          found = true;
          break;
        }
      }

      // 如果下方没有食材，生成新食材（使用补充配置 refill）
      if (!found) {
        this.grid[row][col].ingredient = this.createSafeIngredient(row, col, true);
      }
    }
  }
}
```

---

## 🛡️ 安全生成机制

### 核心规则

新生成的食材不能立即形成三连（无论是初始填充还是补位生成）。

```typescript
/**
 * 创建不会形成三连的食材
 * @param useRefillConfig 是否使用补充配置（refill），否则使用初始配置（initial）
 */
private createSafeIngredient(row: number, col: number, useRefillConfig: boolean = false): Ingredient {
  const flavor = this.getRandomFlavorByDistribution();
  const type = this.getRandomIngredientType(useRefillConfig);
  let ingredient = createIngredient(type, flavor);
  let attempts = 0;
  const maxAttempts = 50;

  // 检查是否会形成水平或垂直三连
  while (attempts < maxAttempts && this.wouldCreateMatch(row, col, ingredient)) {
    const newFlavor = this.getRandomFlavorByDistribution();
    const newType = this.getRandomIngredientType(useRefillConfig);
    ingredient = createIngredient(newType, newFlavor);
    attempts++;
  }

  return ingredient;
}

/**
 * 检查在指定位置放置食材是否会形成三连
 */
private wouldCreateMatch(row: number, col: number, ingredient: Ingredient): boolean {
  // 临时放置食材
  const originalIngredient = this.grid[row][col].ingredient;
  this.grid[row][col].ingredient = ingredient;

  // 检查水平方向
  let horizontalCount = 1;
  // 向左检查
  for (let c = col - 1; c >= 0 && this.grid[row][c].ingredient?.type === ingredient.type; c--) {
    horizontalCount++;
  }
  // 向右检查
  for (let c = col + 1; c < GRID_SIZE && this.grid[row][c].ingredient?.type === ingredient.type; c++) {
    horizontalCount++;
  }

  // 检查垂直方向
  let verticalCount = 1;
  // 向上检查
  for (let r = row - 1; r >= 0 && this.grid[r][col].ingredient?.type === ingredient.type; r--) {
    verticalCount++;
  }
  // 向下检查
  for (let r = row + 1; r < GRID_SIZE && this.grid[r][col].ingredient?.type === ingredient.type; r++) {
    verticalCount++;
  }

  // 恢复原状
  this.grid[row][col].ingredient = originalIngredient;

  // 如果水平或垂直方向达到3个或以上，会形成匹配
  return horizontalCount >= 3 || verticalCount >= 3;
}
```

### 配置区分

- **初始填充** (`fillBoard`): 使用 `initialSpawnConfig` 配置
- **补位生成** (`fillColumn`): 使用 `refillSpawnConfig` 配置

两者都可以配置不同的食材类型权重分布。

---

## 🎬 动画系统

### 动画类型

```typescript
type AnimationType = 'swap' | 'fall' | 'disappear' | 'merge';

interface Animation {
  id: string;
  type: AnimationType;
  startTime: number;
  duration: number;
  from: GridPosition;      // 起始位置
  to: GridPosition;        // 目标位置
  fromPixel?: { x: number; y: number };
  toPixel?: { x: number; y: number };
  progress: number;        // 0.0 ~ 1.0
  onComplete?: () => void;
}
```

### 下落动画

```typescript
// 创建下落动画
animationManager.createFallAnimation(
  from: { row: 3, col: 3 },  // 起始位置（上方）
  to: { row: 5, col: 3 },    // 目标位置（下方空位）
  onComplete: () => {},
  duration: 300
);

// 渲染下落动画
renderFallAnimation(animation: Animation, ingredient: Ingredient): void {
  const progress = this.easeOutBounce(animation.progress);
  const currentX = animation.fromPixel.x + 
    (animation.toPixel.x - animation.fromPixel.x) * progress;
  const currentY = animation.fromPixel.y + 
    (animation.toPixel.y - animation.fromPixel.y) * progress;
  
  // 注意：fromPixel.y < toPixel.y（从上方移动到下方）
  this.renderIngredientAt(currentX, currentY, ingredient.emoji, 1);
}
```

---

## ⚠️ 关键约束

### 1. 食材生成限制

```typescript
// 根据关卡配置的权重随机选择食材类型
private getRandomIngredientType(useRefillConfig: boolean = false): IngredientType {
  const config = useRefillConfig ? this.refillSpawnConfig : this.initialSpawnConfig;
  
  if (config?.tierWeights) {
    const weights = config.tierWeights;
    // 根据权重随机选择...
  }
  
  // 默认返回小麦
  return 'wheat';
}
```

### 2. 安全生成保证

- 初始填充：`createSafeIngredient(row, col, false)` 确保开局无三连
- 补位生成：`createSafeIngredient(row, col, true)` 确保补位无三连
- 最大尝试次数：50次，超过则使用最后一次结果

### 3. 连锁反应

```typescript
// 支持无限连锁反应
private async processMatches(): Promise<void> {
  while (true) {
    const matchResult = this.matchDetector.detectMatches(this.board.getAllCells());
    if (matchResult.matches.length === 0) break;
    
    // 处理匹配...
    
    // 下落补位
    await this.fillEmptyCellsWithAnimation();
  }
}
```

### 4. 坐标边界检查

```typescript
// 所有位置操作都经过有效性检查
function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
}
```

---

## 📝 开发备忘

### 常见错误

1. **混淆上下方向**：
   - ❌ 错误：row 增大是"上浮"
   - ✅ 正确：row 增大是"下落"（从顶部向底部移动）

2. **扫描方向**：
   - ❌ 错误：从顶部向下扫描
   - ✅ 正确：从底部向上扫描

3. **新食材生成位置**：
   - ❌ 错误：新食材从底部生成
   - ✅ 正确：新食材从顶部生成（row=0 或上方）

### 调试技巧

```typescript
// 打印网格状态
private logGridState(label: string): void {
  console.log(`\n=== ${label} ===`);
  const grid = this.board.getAllCells();
  for (let row = 0; row < 7; row++) {
    let rowStr = `Row ${row}: `;
    for (let col = 0; col < 7; col++) {
      const ing = grid[row][col].ingredient;
      rowStr += ing ? ing.emoji : '⬜';
      rowStr += ' ';
    }
    console.log(rowStr);
  }
}
```

---

## 🔗 相关文档

- [游戏核心设计](./game-design.md) - 游戏机制说明
- [关卡设计](./level-design.md) - 关卡配置结构
- [数据模型](./data-model.md) - 食材类型定义
- [游戏循环](./game-loop.md) - 匹配检测与处理

---

*最后更新: 2026-03-17*
