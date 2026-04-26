# 📋 Phase 2: Plan - 方案规划文档

> 🏷️ **版本**: v1.0  
> 📅 **创建日期**: 2026-03-05  
> 📝 **状态**: 历史规划，仅供回顾  
> 🎯 **目标**: 制定详细实施方案，明确开发顺序与里程碑

> 注意: 本文档记录的是项目早期计划，不再作为当前实现和文档导航的主依据。当前规则以 `doc/` 下核心规范文档和实际代码为准。

---

## 📁 目录

1. [🚀 项目初始化](#-项目初始化)
2. [📦 技术依赖](#-技术依赖)
3. [🏗️ 文件结构规划](#️-文件结构规划)
4. [📋 开发顺序](#-开发顺序)
5. [🎯 里程碑规划](#-里程碑规划)
6. [📝 沉淀规划](#-沉淀规划)

---

## 🚀 项目初始化

### 技术栈确认

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 📝 语言 | TypeScript | 5.x | 类型安全 |
| ⚡ 构建 | Vite | 5.x | 极速HMR |
| 🎨 渲染 | Canvas 2D | - | 游戏画面 |
| 💾 存储 | localStorage | - | 存档数据 |

### 初始化命令

```bash
# 1. 创建 Vite + TypeScript 项目
npm create vite@latest . -- --template vanilla-ts

# 2. 安装依赖
npm install

# 3. 开发模式启动
npm run dev

# 4. 构建
npm run build
```

### 项目配置

**tsconfig.json 关键配置**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "bundler"
  }
}
```

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'es2020',
    outDir: 'dist'
  }
})
```

---

## 📦 技术依赖

### 核心依赖（无外部库）

本项目采用**零依赖**策略，仅使用：
- ✅ TypeScript（语言）
- ✅ Vite（构建工具）
- ✅ 原生 Canvas 2D API（渲染）
- ✅ 原生 Web APIs（localStorage, requestAnimationFrame）

### 开发依赖

```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

---

## 🏗️ 文件结构规划

```
Toast_N_Roll_Demo/
├── 📁 src/
│   ├── 📁 core/                    # 🧠 核心游戏逻辑
│   │   ├── 📄 board.ts             # 🍞 游戏板管理
│   │   ├── 📄 match-detector.ts    # 🔮 三连检测
│   │   ├── 📄 ingredient.ts        # 🥐 食材系统
│   │   ├── 📄 customer.ts          # 👤 顾客系统
│   │   └── 📄 score-manager.ts     # 💰 分数管理
│   │
│   ├── 📁 state/                   # 📊 状态管理
│   │   ├── 📄 store.ts             # 🗃️ 全局状态
│   │   ├── 📄 actions.ts           # 🔄 动作定义
│   │   └── 📄 selectors.ts         # 🔍 状态选择器
│   │
│   ├── 📁 render/                  # 🎨 渲染系统
│   │   ├── 📄 renderer.ts          # 🖼️ 主渲染器
│   │   ├── 📄 grid-renderer.ts     # ⬜ 格子渲染
│   │   ├── 📄 ingredient-sprite.ts # 🍞 食材精灵
│   │   ├── 📄 animation.ts         # ✨ 动画系统
│   │   └── 📄 particle.ts          # 🎆 粒子效果
│   │
│   ├── 📁 ui/                      # 🖱️ UI组件
│   │   ├── 📄 ui-manager.ts        # 🎛️ UI管理器
│   │   ├── 📄 top-panel.ts         # ⬆️ 顶部面板
│   │   ├── 📄 bottom-panel.ts      # ⬇️ 底部面板
│   │   └── 📄 modal.ts             # 🪟 弹窗组件
│   │
│   ├── 📁 input/                   # 🎮 输入处理
│   │   ├── 📄 drag-handler.ts      # 🖱️ 拖拽输入处理器
│   │   └── 📄 gesture.ts           # 👆 手势识别
│   │
│   ├── 📁 systems/                 # ⚙️ 子系统
│   │   ├── 📄 storage.ts           # 💾 存储系统
│   │   ├── 📄 event-bus.ts         # 📡 事件总线
│   │   └── 📄 ad-simulator.ts      # 📺 广告模拟
│   │
│   ├── 📁 types/                   # 📋 类型定义
│   │   ├── 📄 index.ts             # 🔗 类型导出
│   │   ├── 📄 ingredient.ts        # 🍞 食材类型
│   │   ├── 📄 game.ts              # 🎮 游戏类型
│   │   └── 📄 events.ts            # 📡 事件类型
│   │
│   ├── 📁 utils/                   # 🛠️ 工具函数
│   │   ├── 📄 grid.ts              # ⬜ 格子计算
│   │   ├── 📄 random.ts            # 🎲 随机工具
│   │   └── 📄 tween.ts             # 📈 补间动画
│   │
│   ├── 📄 main.ts                  # 🚀 应用入口
│   └── 📄 game.ts                  # 🎮 游戏主类
│
├── 📁 assets/                      # 🎨 静态资源
│   └── 📁 sprites/                 # 🖼️ 精灵图（emoji占位）
│
├── 📁 doc/                         # 📚 项目文档
├── 📄 index.html                   # 🌐 HTML入口
├── 📄 package.json                 # 📦 项目配置
├── 📄 tsconfig.json                # ⚙️ TS配置
└── 📄 vite.config.ts               # ⚡ Vite配置
```

---

## 📋 开发顺序（按优先级）

### 阶段一：基础框架

| 顺序 | 任务 | 文件 | 说明 |
|------|------|------|------|
| 1 | 项目初始化 | - | Vite + TS 环境搭建 |
| 2 | 类型定义 | `types/*.ts` | 核心类型接口 |
| 3 | 事件总线 | `systems/event-bus.ts` | 全局事件通信 |
| 4 | 状态管理 | `state/store.ts` | 全局状态存储 |
| 5 | 存储系统 | `systems/storage.ts` | localStorage封装 |

### 阶段二：核心逻辑

| 顺序 | 任务 | 文件 | 说明 |
|------|------|------|------|
| 6 | 格子计算 | `utils/grid.ts` | 坐标、位置计算 |
| 7 | 食材系统 | `core/ingredient.ts` | 食材类型、属性 |
| 8 | 游戏板 | `core/board.ts` | 格子状态管理 |
| 9 | 三连检测 | `core/match-detector.ts` | 横竖匹配算法 |
| 10 | 顾客系统 | `core/customer.ts` | 顾客队列、需求 |
| 11 | 分数管理 | `core/score-manager.ts` | 金币、成就 |

### 阶段三：渲染系统

| 顺序 | 任务 | 文件 | 说明 |
|------|------|------|------|
| 12 | 主渲染器 | `render/renderer.ts` | Canvas初始化 |
| 13 | 格子渲染 | `render/grid-renderer.ts` | 绘制格子 |
| 14 | 食材精灵 | `render/ingredient-sprite.ts` | 绘制食材 |
| 15 | 动画系统 | `render/animation.ts` | 补间动画 |
| 16 | 粒子效果 | `render/particle.ts` | 特效粒子 |

### 阶段四：UI系统

| 顺序 | 任务 | 文件 | 说明 |
|------|------|------|------|
| 17 | 输入处理 | `input/*.ts` | 点击、拖拽 |
| 18 | UI管理器 | `ui/ui-manager.ts` | UI协调 |
| 19 | 顶部面板 | `ui/top-panel.ts` | 金币、顾客 |
| 20 | 底部面板 | `ui/bottom-panel.ts` | 道具按钮 |
| 21 | 弹窗组件 | `ui/modal.ts` | 广告、提示 |

### 阶段五：游戏整合

| 顺序 | 任务 | 文件 | 说明 |
|------|------|------|------|
| 22 | 游戏主类 | `game.ts` | 游戏逻辑整合 |
| 23 | 广告模拟 | `systems/ad-simulator.ts` | 广告系统 |
| 24 | 应用入口 | `main.ts` | 启动游戏 |
| 25 | 测试调优 | - | Bug修复、优化 |

---

## 🎯 里程碑（功能导向）

### Milestone 1: 基础框架 ✅
```
目标: 可运行的空项目
交付物:
  - Vite + TS 环境
  - 类型定义完成
  - 事件系统可用
  - 状态管理可用
```

### Milestone 2: 核心逻辑 ✅
```
目标: 游戏逻辑可运行（无UI）
交付物:
  - 游戏板管理
  - 三连检测
  - 食材合成
  - 顾客系统
  - 可通过console测试
```

### Milestone 3: 渲染系统 ✅
```
目标: 可看到游戏画面
交付物:
  - 格子渲染
  - 食材显示
  - 基础动画
  - 可交互（点击、交换）
```

### Milestone 4: 完整游戏 ✅
```
目标: 可玩的完整游戏
交付物:
  - UI界面完整
  - 广告系统
  - 存档功能
  - 所有功能可用
```

---

## 📝 沉淀规划

### Global Compound（全局沉淀）

**路径**: `/home/liubo/agent_coding_compound/`

| 文件 | 沉淀内容 |
|------|----------|
| `AI_MEMORY.md` | Canvas 2D 游戏开发模式 |
| `ARCHITECTURE.md` | 轻量级状态管理设计 |
| `global_style.md` | TypeScript 游戏开发规范 |

### Local Compound（本次任务）

**路径**: `local_compound.md`

**仅本次生效**:
- 项目特定设计决策
- 原型阶段取舍记录
- 技术选型理由

---

*本文档为 Plan 阶段产出，指导 Execute 阶段实施*
