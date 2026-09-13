# 代码地图

## 入口

- `decoder_v1.js`：命令行和批量输入边界，维护受支持的 domain 白名单；
- `decoder_protocol.js`：把 domain 路由到具体解码器并统一结果字段；
- `package.json`：测试、验收、审计、清单和版本基准命令。

## 黑箱动力系统主线

- `decoder_blackbox_dynamics.js`：训练转移拟合二维整数多项式映射；留出转移拒绝错误映射；调用动力系统不变量证书；
- `dynamics_invariant.js`：多项式代数、线性零空间和不变量发现；
- `dynamics_invariant_verifier.js`：独立重放不变量证书；
- `dynamics/blackbox_active_design.js`：有限一次映射版本空间和下一状态推荐；
- `dynamics/blackbox_active_experiment.js`：主动/被动采样实验；
- `dynamics/linear_query_lower_bound.js`：对 v3.1 的允许状态格点枚举单次查询并证明两次查询下界；
- `dynamics/branching_query_design.js`：精确比较有限黑箱候选族的自适应条件决策树和最优固定查询集合；
- `dynamics/parametric_branching_family.js`：参数化运行区间—局部响应黑箱族及其公式—穷举交叉验证；
- `dynamics/piecewise_map_family.js`：二维分段整数映射、区域求值和条件查询设计交叉验证；
- `dynamics/piecewise_map_inference.js`：从训练/留出状态转移恢复分段映射参数，并连接条件查询设计；
- `dynamics_composed_search.js`：坐标变换负对照，不是当前能力主张。

## 证据与发布

- `benchmark_v3_0*`：v3.0 黑箱结构发现基准；
- `benchmark_v3_1*`：v3.1 主动观测基准；
- `benchmark_v3_2*`：v3.2 线性查询最优性下界基准；
- `benchmark_v3_3*`：v3.3 分支查询优势与无优势对照基准；
- `benchmark_v3_4*`：v3.4 参数化族的校准/参数留出比较基准；
- `benchmark_v3_5*`：v3.5 分段映射族的校准/映射参数留出比较基准；
- `benchmark_v3_6*`：v3.6 分段映射参数恢复、留出淘汰和主动查询基准；
- `decoder_acceptance.js`：统一端到端验收；
- `decoder_audit.js`：结果分类和汇总审计；
- `decoder_manifest.js`：支持根目录和子目录路径的完整性清单。

## 文档与上下文

- `PROJECT_CONTEXT.md`：短上下文，优先读取；
- `CODEBASE_MAP.md`：本文件，按模块定位代码；
- `docs/README.md`：文档入口；
- `docs/HISTORY.md`：历史材料说明。

## 旧模块

数列、图、方程、多项式、参数族和 v1/v2 benchmark 继续作为基线、消融和迁移测试。它们不属于 v3.1 的新功能面。
