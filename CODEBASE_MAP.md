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
- `dynamics_composed_search.js`：坐标变换负对照，不是当前能力主张。

## 证据与发布

- `benchmark_v3_0*`：v3.0 黑箱结构发现基准；
- `benchmark_v3_1*`：v3.1 主动观测基准；
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
