# 动力系统模块

`blackbox_active_design.js` 和 `blackbox_active_experiment.js` 属于当前研究主线。前者在明确的一次有限映射空间中输出下一状态建议和可重放证书；后者用独立矩阵求值器做完整有限比较。

根目录的 `dynamics_invariant.js`、`dynamics_invariant_verifier.js` 和 `decoder_blackbox_dynamics.js` 是此目录模块依赖的稳定基础。`dynamics_composed_search.js` 是负对照。
