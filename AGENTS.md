# 🤖 Toast N Roll - Cocos Creator 项目 AGENTS.md

> **项目**: Toast N Roll (吐司面包店)
> **平台**: Cocos Creator 3.8+
> **架构**: 纯规则层 (domain/) + Cocos 视图层 (view/) + 会话编排 (game/session/)
> **文档状态**: 迁移已完成，详见 `assets/script/MIGRATION.md`

---

## 📁 目录结构

```
Toast_N_Roll_Demo2/
├── assets/
│   ├── script/
│   │   ├── domain/           # 纯游戏规则（无 Cocos 依赖）
│   │   │   ├── core/         # board.ts, match-detector.ts, customer.ts, ingredient.ts, flavor-manager.ts
│   │   │   ├── types/        # index.ts, level.ts
│   │   │   └── utils/        # random.ts
│   │   ├── game/
│   │   │   └── session/      # GameSession.ts（应用编排层）
│   │   ├── view/             # Cocos 视图组件（BoardView, HudView, CellView 等）
│   │   ├── infra/            # Cocos 基础设施（资源加载、存档、设置）
│   │   └── bootstrap/        # GameScene.ts（场景入口）
│   └── resources/
│       ├── config/           # game.json（关卡配置等）
│       └── prefabs/          # Cell.prefab, HudRoot.prefab, ToolBarRoot.prefab
├── doc/                      # 当前项目文档（现行规范）
├── docs_origin/              # 历史文档（参考）
├── extensions/
│   └── cocos-mcp-server/     # Cocos MCP 服务器插件
├── profiles/                 # 构建配置
├── settings/                 # 编辑器设置
└── temp/                     # 临时文件（含 tsconfig）
```

---

## 🎯 架构原则

### 核心规则（domain/）
- **纯 TypeScript**，无 `cc` 依赖
- 包含棋盘、匹配检测、顾客、食材进阶等核心逻辑
- 可独立测试，不依赖 Cocos 运行

### 会话编排（game/session/）
- `GameSession` 作为应用编排层
- 暴露会话快照 (`SessionStateSnapshot`) 和事件 (`SessionEvent`)
- 视图层通过订阅 Session 实现渲染

### 视图层（view/）
- 薄组件，依赖 Cocos `cc` 模块
- 通过 Session 事件驱动，不直接修改 domain 规则
- 拖拽交互委托给 `BoardView`

### 迁移规则
- 棋盘规则、匹配检测、顾客逻辑、关卡配置必须保持为纯 TypeScript 模块
- Prefab 和场景数据不能作为游戏规则的单一事实来源
- 场景组件保持薄层

---

## 🛠️ 开发命令

### Cocos CLI
```bash
# 需在 Cocos Creator 编辑器中运行，或使用本地 cocos CLI
cocos build --workspace . --platforms web-mobile
cocos run --workspace . --platforms web-mobile
```

### TypeScript
```bash
# 类型检查（使用项目 tsconfig）
npx tsc --noEmit

# 或直接执行（项目 tsconfig.json extends temp/tsconfig.cocos.json）
npx tsc -p tsconfig.json --noEmit
```

### MCP 服务器
```bash
# 启动 MCP 服务器供 AI 工具调用
cocos start-mcp-server
```

---

## 📐 代码规范

### TypeScript 配置
- `strict: false`（继承自 `temp/tsconfig.cocos.json`）
- 推荐尽量启用严格模式以保持代码质量
- `verbatimModuleSyntax` 不强制，但优先使用 `import type`

### 导入规范
```typescript
// 类型导入
import type { Cell, GridPosition, Ingredient } from '../domain/types';

// 值导入
import { GameBoard } from '../domain/core/board';
import { createIngredient } from '../domain/core/ingredient';

// Cocos 模块（仅 view/ 和 infra/ 层使用）
import { _decorator, Component, Node, Prefab, instantiate, resources } from 'cc';
```

### 命名约定
| 类型 | 约定 | 示例 |
|------|------|------|
| 类/接口/类型别名 | PascalCase | `GameBoard`, `Ingredient`, `Cell` |
| 变量/函数/方法 | camelCase | `setGridSize`, `getIngredient` |
| 常量 | SCREAMING_SNAKE_CASE | `BOARD_WIDTH`, `GRID_SIZE` |
| 私有成员 | `_` 开头 | `_grid`, `_flavorDistribution` |
| 文件名 | camelCase | `board.ts`, `matchDetector.ts` |

### Cocos 组件装饰器
```typescript
import { _decorator, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('BoardView')
export class BoardView extends Component {
  @property(Node)
  private rootNode: Node | null = null;
}
```

### 代码风格
- **分号**: 不使用（依赖 ASI）
- **缩进**: 4 空格
- **引号**: 单引号优先
- **注释**: 中文描述，emoji 开头
  ```typescript
  /**
   * 🍞 游戏板管理
   * 支持动态网格大小的格子矩阵管理
   */
  ```
- **类型定义**: 使用 `type`，除非需要继承
- **不可变对象**: 使用 `as const`

### 错误处理
- 内部断言使用 `assert`（Node.js 内置）
- 公开 API 使用条件检查 + 抛出 `Error`
- 异步错误使用 `try/catch`

### 禁止事项
- `any` 类型（尽量避免）
- `// @ts-ignore`
- `var`（使用 `const`/`let`）
- `for...in` 遍历数组（使用 `for...of`）
- 避免在 domain 层直接使用 Cocos 模块

---

## 🔧 Cocos MCP 工具使用

详见 `extensions/cocos-mcp-server/FEATURE_GUIDE_CN.md`

常用工具类别：
- **场景操作**: `scene_get_current_scene`, `scene_open_scene`, `scene_save_scene`
- **节点操作**: `node_add_component`, `node_get_children`, `node_set_position`
- **预制体**: `prefab_instantiate`, `prefab_save`
- **资源**: `asset_get_resources`, `asset_load`

### 工作流建议
1. 使用 `scene_get_current_scene` 确认当前场景
2. 使用 `node_get_children` 查看场景节点树
3. 使用 `asset_load` 加载资源后，通过 `prefab_instantiate` 实例化
4. 修改前后使用 `scene_save_scene` 保存

---

## 📋 代码质量标准 (TheOne Cocos Standards)

### 🔴 优先级 1：代码质量（必须遵守）

**必须执行以下规则：**
1. **TypeScript strict mode** - 尽量启用 `"strict": true`
2. **Access modifiers** - 所有成员必须使用 `public/private/protected`
3. **抛出异常** - 错误必须抛出异常，不能静默失败
4. **console.log 仅用于开发** - 生产环境必须移除或用 `CC_DEBUG` 包裹
5. **readonly** - 不可重新赋值的字段使用 `readonly`
6. **const** - 常量必须使用 `const`
7. **无内联注释** - 使用描述性命名，代码应自解释
8. **正确处理 null/undefined** - 使用可选链 `?.` 和空值合并 `??`
9. **类型安全** - 避免 `any`，使用 proper types

**组件生命周期：**
```
onLoad()  → 初始化（一次性设置）
start()   → 所有组件加载后（可引用其他组件）
onEnable() → 注册事件监听
update()  → 每帧（playable 要避免重操作）
onDisable() → 取消注册事件监听
onDestroy() → 清理，移除监听，释放资源
```

**错误处理示例：**
```typescript
protected onLoad(): void {
  if (!this.targetNode) {
    throw new Error('BoardView: targetNode is required');
  }
}
```

**事件监听清理：**
```typescript
protected onEnable(): void {
  this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
}

protected onDisable(): void {
  this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
}
```

### 🟡 优先级 2：现代 TypeScript 模式
- 使用 `map/filter/reduce` 替代手动循环
- 使用箭头函数、解构、展开运算符
- 使用可选链 `?.` 和空值合并 `??`
- 使用类型守卫和 utility types

### 🟢 优先级 3：Cocos Creator 架构
- 组件继承 `Component`，使用 `@ccclass` 和 `@property`
- 优先绑定已有 prefab 子节点，不轻易移动规则到 prefab 值
- Prefab 化进行时：prefab 拥有稳定层级，script 拥有动态内容

### 🔵 优先级 4：Playable 性能
- DrawCall batching < 10
- 使用 Sprite Atlas
- update() 中零分配，预分配并复用对象
- 节流昂贵操作（不是每帧都执行）
- Bundle size < 5MB

---

## 📐 Cocos 验证脚本

```bash
# 检查 Cocos 环境
scripts/check-cocos-env.sh <project-root>

# 验证 TypeScript 入口点
scripts/validate-cocos-entry.sh <entry.ts> [outfile]

# 验证 Prefab/Scene JSON
scripts/validate-cocos-json.sh <asset.json>
```

---

## 📋 项目状态

### 已完成
- `GameSession` 暴露会话快照和事件
- `BoardView` 处理拖拽交换和分阶段时间线
- `HudView` / `ToolBarView` 分离
- `CellView` 准备好替换为真实 Prefab
- `Cell.prefab` / `HudRoot.prefab` / `ToolBarRoot.prefab` 已创建
- 场景流程: `Loading.scene -> Lobby.scene -> Game.scene`
- 存档系统 (CocosSaveStorage, LevelProgressStore, SettingsStore)
- 设置/教程为 Cocos 叠加层

### 进行中
- Prefab 化推进
- 视觉美化
- Cell 逻辑重构（Tray 合并 + 口味徽章）

---

## 🔍 日志分析指南

### 日志位置

| 环境 | 日志路径 | 说明 |
|------|----------|------|
| Windows 编辑器 | `temp/logs/project.log` | Cocos Creator 编辑器运行日志 |
| Windows 预览 | `temp/logs/project.log` | 预览时产生的日志 |
| 构建日志 | `temp/logs/build.log` | 构建时的日志 |

### WSL2 环境下查看 Windows 日志

由于项目在 WSL2 中访问 Windows 文件系统，日志路径映射为：
```bash
# Windows 路径: D:\project\Toast_N_Roll_Demo2\temp\logs\project.log
# WSL2 路径: /mnt/d/project/Toast_N_Roll_Demo2/temp/logs/project.log
```

### 常用日志分析命令

```bash
# 查看最新日志（最后 100 行）
tail -100 /mnt/d/project/Toast_N_Roll_Demo2/temp/logs/project.log

# 查看错误日志
grep -i "error" /mnt/d/project/Toast_N_Roll_Demo2/temp/logs/project.log | tail -50

# 查看特定模块日志
grep "\[Assets\]" /mnt/d/project/Toast_N_Roll_Demo2/temp/logs/project.log | tail -20
grep "\[Scene\]" /mnt/d/project/Toast_N_Roll_Demo2/temp/logs/project.log | tail -20
grep "\[PreviewInEditor\]" /mnt/d/project/Toast_N_Roll_Demo2/temp/logs/project.log | tail -20

# 查看 TypeScript 编译错误
grep "TS[0-9]" /mnt/d/project/Toast_N_Roll_Demo2/temp/logs/project.log | tail -30

# 统计错误数量
grep -c "error:" /mnt/d/project/Toast_N_Roll_Demo2/temp/logs/project.log
```

### 常见错误类型

| 错误模式 | 原因 | 解决方案 |
|----------|------|----------|
| `Input Buffer is empty` | PNG 文件为空或损坏 | 删除空文件，重新从 Figma 下载 |
| `Importer exec failed` | 资源导入失败 | 检查文件格式和完整性 |
| `TS2xxx` | TypeScript 编译错误 | 修复类型定义或代码 |
| `Cannot find module` | 模块路径错误 | 检查 import 路径 |
| `Prefab not found` | Prefab 路径错误 | 检查 resources 目录 |

### 日志级别

- `log`: 普通信息
- `info`: 重要信息（如预览初始化）
- `error`: 错误（需要修复）
- `warn`: 警告（可选修复）

---

*最后更新: 2026-05-01*
