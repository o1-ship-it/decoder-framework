# Decoder Framework v3.6.0

这是一个把“表示—推理—反馈—验证”落实为实验系统的研究原型。北极星目标是：从有限观测发现数学结构，输出独立可验证证书，明确表达不可识别性，并主动选择下一条最有价值的证据。

项目状态与路线见 [PROJECT_STATUS.md](PROJECT_STATUS.md)，当前上下文见 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)，代码地图见 [CODEBASE_MAP.md](CODEBASE_MAP.md)。研究目标见 [PROJECT_NORTH_STAR.md](PROJECT_NORTH_STAR.md)，v3 策略见 [RESEARCH_STRATEGY_v3.md](RESEARCH_STRATEGY_v3.md)。

## 当前主线

旗舰方向是黑箱二维离散动力系统：

1. 从有限状态转移生成受限候选映射；
2. 用训练数据筛选候选，并用独立留出数据淘汰错误映射；
3. 对剩余候选计算不变量、可识别性和主动查询计划；
4. 输出证书、反例、不可识别性和明确的适用边界。

v3.6 已把二维分段映射的参数恢复、留出验证和条件查询连接成一条可重放管线。分段模板和参数边界仍是预先声明的有限空间，结果不外推到未知表示规则或通用动力系统。

## 统一入口

`decoder_v1.js` 接受带 `domain` 的 JSON 对象，支持数列、图、方程、多项式、动力系统、隐藏机制和黑箱查询等实验域。当前黑箱主线域包括：

- `blackbox_dynamics`：从状态转移拟合受限多项式映射并验证不变量；
- `blackbox_active_observation_design`：在有限映射版本空间中选择下一状态；
- `blackbox_branching_query_design`：比较条件决策树与最优固定查询集合；
- `blackbox_parametric_query_design`：验证参数化运行区间—局部响应族的查询优势；
- `blackbox_piecewise_map_query_design`：由二维分段映射求值生成候选转移；
- `blackbox_piecewise_map_inference`：从训练/留出转移恢复分段映射参数，并为剩余歧义规划查询。

单个对象示例：

```text
echo {"domain":"equation","equation":{"terms":{"x":6,"y":-3},"constant":9}} | node decoder_v1.js
```

## 验证与边界

候选结果包含解码器、表示、复杂度、残差、验证状态和适用边界。未知对象、秩不足、冲突和反例会保留为不确定或反驳状态，不会被强行改写为成功。证书由独立验证器重放，篡改候选或结果会被拒绝。

当前实现面向小型、无噪声、整数或有限图对象。复杂度是任务相关的代理指标；有限样本验证不自动构成无限数学定理。机器内部表示可以不透明，但验证接口必须可重算，机器可读性和人类可读性分开报告。

## 可复现实验

```text
npm test
npm run acceptance
npm run audit
npm run manifest
npm run benchmark:v3.6
```

v3.0–v3.6 基准均可独立重放。v3.6 基准包含唯一恢复、部分恢复、主动查询、训练冲突和留出冲突，共 6 个冻结案例；4x2 参数留出中主动查询最坏深度为 2，固定基线为 5。

## 文档

- 当前发布：[RELEASE_NOTES_v3_6.md](RELEASE_NOTES_v3_6.md)
- 最新反思：[RESEARCH_REFLECTION_v3_6.md](RESEARCH_REFLECTION_v3_6.md)
- 历史索引：[docs/HISTORY.md](docs/HISTORY.md)
- 后续路线：[RESEARCH_ROADMAP.md](RESEARCH_ROADMAP.md)