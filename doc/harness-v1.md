# 🧪 Harness V1

> 创建日期: 2026-03-19  
> 状态: ✅ 已确认  
> 目标: 给 AI Agent 和人工协作提供一套最小可执行的工程护栏

---

## 目的

Harness V1 用来把关键规则从“文档约定”升级为“可执行检查”。

当前覆盖两类高风险内容：
- 关卡配置合法性
- 核心上浮补位机制

---

## 命令入口

```bash
npm run harness
```

也可以分开执行：

```bash
npm run harness:validate-levels
npm run harness:test-board
```

---

## 覆盖范围

### 1. 关卡配置校验

脚本: `scripts/harness/validate-levels.ts`

检查内容：
- `public/assets/levels/level-*.json` 文件名与 `levelId` 一致
- 正式关卡 `1-50` 连续递增
- 调试关 `level-000.json` 存在，且必须 `hidden=true`、`trackProgress=false`
- `gridSize` 保持 `5x5` 到 `7x7` 且维持方阵
- `flavors.distribution`、`refillBias`、`ingredientSpawn.*.flavorDistribution` 权重和为 `100`
- `customers`、`starRatings` 等关键字段合法
- `presetBoard` 尺寸与元素类型合法

### 2. 上浮补位回放测试

脚本: `scripts/harness/run-board-tests.ts`

覆盖场景：
- 混合空洞时，下方已有食材必须向上补位
- 整列空时，必须补满且不留空格
- 强制安全兜底路径不能崩溃

---

## 工程接入点

- 运行时关卡加载使用共享校验器：`src/core/level-validator.ts`
- `LevelLoader` 在加载关卡时直接复用该校验器
- `GameBoard` 的兜底补位逻辑已修正，避免整列重试失败后访问未生成元素

---

## 使用规则

适合纳入日常工作流：

1. 改关卡 JSON 前后跑一次 `npm run harness:validate-levels`
2. 改 `board.ts`、匹配逻辑、补位逻辑后跑一次 `npm run harness:test-board`
3. 合并前跑完整 `npm run harness`

---

## V1 边界

V1 还没有覆盖：
- 顾客系统回放
- 老虎机口味决策回放
- 完整 UI / 动画端到端测试
- 存档与关卡解锁回放

这些适合作为 Harness V2 的扩展方向。
