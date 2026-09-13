# 动力系统模块

`blackbox_active_design.js` 和 `blackbox_active_experiment.js` 属于当前研究主线。前者在明确的一次有限映射空间中输出下一状态建议和可重放证书；后者用独立矩阵求值器做完整有限比较。

`linear_query_lower_bound.js` 记录该线性族在 v3.1 允许格点上的无优势下界。`branching_query_design.js` 则精确比较任意显式有限黑箱候选族的条件决策树与固定查询集合；v3.3 的默认族给出严格优势，配套对照族给出无优势结果。两者都只在声明的候选、查询和无噪声假设内成立。

根目录的 `dynamics_invariant.js`、`dynamics_invariant_verifier.js` 和 `decoder_blackbox_dynamics.js` 是此目录模块依赖的稳定基础。`dynamics_composed_search.js` 是负对照。
