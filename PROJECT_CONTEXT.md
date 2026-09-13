# 项目上下文摘要

这是当前项目唯一需要优先读取的上下文文件。历史版本说明和研究反思保留在仓库中，但不应作为当前计划的默认上下文。

## 北极星目标

从有限观测发现数学结构，输出独立可验证证书，明确表示不可识别性，并主动选择最有价值的下一条证据。

## 当前主线

黑箱二维离散动力系统：状态转移 → 受限多项式映射 → 留出验证 → 不变量证书 → 主动观测设计。

## 当前版本

v3.6.0 已完成。系统从有限状态转移训练数据筛选二维分段映射候选，用留出转移淘汰错误参数，并在剩余候选上计算条件查询设计。当前边界仍是小型、无噪声、显式枚举的候选系统，不代表未知表示规则的通用系统识别。

## 当前模块

- `decoder_blackbox_dynamics.js`：从转移拟合映射并验证不变量；
- `dynamics/blackbox_active_design.js`：枚举有限映射版本空间，选择最大化最坏排除数的状态；
- `dynamics/blackbox_active_experiment.js`：固定合成任务上的主动与被动采样比较；
- `dynamics/linear_query_lower_bound.js`：在 v3.1 的允许格点中证明线性映射族至少需要两次查询，轴向查询达到下界；
- `dynamics/branching_query_design.js`：枚举有限黑箱候选族上的条件决策树与最优固定查询集合；
- `dynamics/parametric_branching_family.js`：生成运行区间—局部响应黑箱族，并以公式和精确查询搜索交叉验证；
- `dynamics/piecewise_map_family.js`：由二维分段整数映射生成候选转移，并交叉验证条件查询优势；
- `dynamics/piecewise_map_inference.js`：从训练/留出转移恢复分段映射参数并连接主动查询设计；
- `decoder_protocol.js`：统一协议入口；
- `decoder_manifest.js`：源码和结果的 SHA-256 可复现清单。

## 当前证据

所有测试、端到端验收、v3.0 至 v3.6 基准、审计和清单均可重放。v3.6 在参数恢复后继续复现 4x2 的 2 对 5 优势，并覆盖唯一恢复、歧义、训练冲突和留出冲突。候选转移由映射求值产生，不再直接作为输入表提供。

## 工作规则

有限样本结果必须保留搜索边界；未知、秩不足、冲突和反例不能被改写为成功。新功能必须服务黑箱动力系统主线，并带有证书重放、失败案例和基准。

## 文档导航

- 目标：`PROJECT_NORTH_STAR.md`
- 当前状态与下一阶段：`PROJECT_STATUS.md`
- v3 策略：`RESEARCH_STRATEGY_v3.md`
- 最新版本研究反思：`RESEARCH_REFLECTION_v3_5.md`
- 代码与测试地图：`CODEBASE_MAP.md`
