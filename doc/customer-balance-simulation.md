# 顾客耐心与食材分布模拟

> 创建日期: 2026-03-27  
> 关联文档: [level-design.md](./level-design.md)、[harness-v1.md](./harness-v1.md)  
> 状态: 已确认

---

## 目的

用可重复的自动模拟，验证以下参数是否合理：

- `customers.basePatience`
- `customers.queuePatienceOffset`
- `customers.entryGraceTurns`
- `ingredientSpawn.initial.tierWeights`
- `ingredientSpawn.refill.tierWeights`
- `ingredientSpawn.initial.flavorDistribution`
- `ingredientSpawn.refill.flavorDistribution`

目标不是求“唯一正确答案”，而是把拍脑袋调参改成“先看数据，再改参数”。

---

## 核心原则

### 1. 耐心值按“有效交换次数”评估

顾客耐心每次只在**有效交换**后扣减 1 点，因此耐心值本质上是：

`顾客愿意等待多少次有效交换`

这意味着耐心设计必须和以下变量一起看：

- 棋盘大小
- 可用口味数
- 单顾客需求数量
- 初始食材阶数分布
- 补位食材阶数分布
- 初始口味分布
- 补位口味分布

### 2. 分布和耐心要联动验证

如果高阶食材生成更积极，顾客耐心可以更紧。
如果补位分布更保守、口味更分散，顾客耐心就必须更松。

所以模拟必须同时支持：

- 固定耐心，调整初始/补位分布
- 固定分布，调整耐心
- 同时调整两者，比较结果差异

---

## 模拟脚本

入口脚本：

- `npm run harness:simulate-balance`

脚本文件：

- [simulate-customer-balance.ts](/home/liubo/project/Toast_N_Roll_Demo/scripts/harness/simulate-customer-balance.ts)

---

## 模拟方法

脚本复用正式逻辑中的：

- `GameBoard`
- `MatchDetector`
- `CustomerSystem`

模拟器执行的是“无动画自动对局”，关键规则与正式游戏保持一致：

- 只选择能形成匹配的交换
- 匹配后按正式逻辑连锁结算
- 使用上浮补位，不使用下落
- 礼盒生成后按正式逻辑自动交付顾客
- 每次有效交换后统一扣减在场顾客耐心
- 无可移动步骤且仍有未结算顾客时记为 `gameOver`

---

## 输出指标

每个关卡会输出以下指标：

- `completionRate`: 全部顾客结算完毕的比例
- `serviceRate`: 被成功服务的顾客占比
- `missRate`: 耐心耗尽离场的顾客占比
- `stuckRate`: 无步可走且仍有顾客未结算的比例
- `avgTurns`: 平均有效交换次数
- `p75Turns`: 75 分位的有效交换次数
- `firstServeP75`: 首次成功服务顾客的 75 分位回合数
- `recommendedBasePatience`: 基于模拟结果给出的首位顾客建议耐心
- `recommendedQueueOffset`: 基于补位顾客等待窗口给出的建议增量

同时会输出按口味聚合的需求/服务统计，用来观察分布是否和顾客需求脱节。

---

## 推荐判读方式

### 教学关

- `completionRate >= 95%`
- `serviceRate >= 90%`
- `stuckRate <= 3%`

### 普通关

- `completionRate >= 80%`
- `serviceRate >= 75%`
- `stuckRate <= 10%`

### 高难关

- `completionRate >= 60%`
- `serviceRate >= 55%`
- `stuckRate <= 18%`

如果模拟结果明显低于目标，可按下面顺序调整：

1. 先看 `stuckRate`
   `stuckRate` 高，优先检查初始/补位分布是否过度压低高阶食材，或口味分布是否过散。
2. 再看 `serviceRate`
   `serviceRate` 低但 `stuckRate` 不高，优先增加 `basePatience` 或 `queuePatienceOffset`。
3. 再看口味统计
   某个口味需求占比高但服务占比明显偏低，优先调整对应口味的 `flavorDistribution`。

---

## 默认扫参与人工覆写

脚本支持两种用法：

### 1. 基线验证

```bash
npm run harness:simulate-balance -- --levels=1,20,50 --iterations=200
```

### 1.1 全量跑完并自动写入 `data/`

```bash
npm run harness:simulate-balance
```

默认会在 `data_inspect/runs/` 下新建一个时间戳目录，并写入：

- `summary.csv`
- `flavor-breakdown.csv`
- `run-meta.json`
- `../index.json` 会自动更新

目录示例：

```text
data_inspect/
  runs/
    index.json
    20260327-214500/
      summary.csv
      flavor-breakdown.csv
      run-meta.json
```

### 1.2 指定输出文件名

```bash
npm run harness:simulate-balance -- \
  --levels=1,2,3,4,5 \
  --iterations=300 \
  --output-csv=tutorial-balance.csv
```

即使指定 `--output-csv`，结果仍会写入本次运行对应的时间戳目录。
`--output-csv` 现在只控制 summary 文件名，口味明细固定输出为 `flavor-breakdown.csv`。

### 2. 手动覆写参数

```bash
npm run harness:simulate-balance -- \
  --levels=20 \
  --iterations=300 \
  --patience-delta=2 \
  --queue-delta=2 \
  --initial-tier-weights=30,30,22,12,6 \
  --refill-tier-weights=28,28,24,12,8 \
  --initial-flavor-distribution=original:55,matcha:45 \
  --refill-flavor-distribution=original:45,matcha:55
```

### 3. 开启标准 sweep

```bash
npm run harness:simulate-balance -- --levels=20 --iterations=200 --sweep
```

### 4. 全量基线后，针对异常关卡单独 sweep 并落盘

```bash
npm run harness:simulate-balance -- \
  --levels=1,2,3,4,5,20 \
  --iterations=200 \
  --sweep \
  --output-csv=data/priority-levels-sweep.csv
```

建议改成：

```bash
npm run harness:simulate-balance -- \
  --levels=1,2,3,4,5,20 \
  --iterations=200 \
  --sweep \
  --output-csv=priority-levels-sweep.csv
```

## 结果查看

静态查看器位置：

- [data_inspect/index.html](/home/liubo/project/Toast_N_Roll_Demo/data_inspect/index.html)

使用方式：

1. 推荐通过本地 HTTP 服务打开 `data_inspect/index.html`
2. 页面会优先自动读取 `data_inspect/runs/index.json`
3. 如果你是直接双击本地 HTML，以 `file://` 打开，则点击“选择 `data_inspect/runs/` 目录”手动加载
4. 页面会分别展示：
   `summary` 主表
   `flavor breakdown` 子表
   `level trend` 趋势图
   `patience gap` 建议值对比图

## 为什么不能直接扫描磁盘

这不是文件夹位置的问题，而是浏览器安全模型限制：

- 静态 HTML 在没有用户授权时，不能直接遍历你本机磁盘目录
- 把结果从 `data/` 挪到 `data_inspect/` 并不会自动解除这个限制
- 真正可行的方式有两种：
  1. 通过 `index.json` manifest 自动发现结果
  2. 让用户手动选择目录

因此当前方案同时支持：

- `data_inspect/runs/index.json` 自动加载
- 目录选择器手动加载

`--sweep` 会在基线外再测试几组常见变体：

- `patience+2`
- `patience+4`
- `queue+2`
- `initial-tier-boost`
- `refill-tier-boost`
- `initial-flavor-uniform`
- `refill-flavor-uniform`

---

## 当前约束

- 自动玩家是启发式策略，不代表真实最优玩家
- 当前推荐值适合做第一轮筛选，不应替代人工试玩
- 该脚本适合先筛出“明显过紧 / 明显过松 / 分布失衡”的关卡

建议工作流：

1. 先跑全量基线，找异常关卡
2. 对异常关卡开 `--sweep`
3. 根据输出缩小到 2-3 组候选配置
4. 再进入真实试玩验证

---

## 变更记录

| 日期 | 变更内容 | 作者 |
|------|----------|------|
| 2026-03-27 | 新增顾客耐心与食材分布模拟文档 | Agent |
| 2026-03-27 | 补充 CSV 输出与全量/局部运行命令 | Agent |
| 2026-03-27 | 补充按时间戳目录落盘与静态查看器说明 | Agent |
| 2026-03-27 | 改为 `data_inspect/runs` 结构化多表输出，并说明浏览器扫描限制 | Agent |
