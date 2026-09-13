# 动力系统模块

`blackbox_active_design.js` 和 `blackbox_active_experiment.js` 属于当前研究主线。前者在明确的一次有限映射空间中输出下一状态建议和可重放证书；后者用独立矩阵求值器做完整有限比较。

`linear_query_lower_bound.js` 记录该线性族在 v3.1 允许格点上的无优势下界。`branching_query_design.js` 则精确比较任意显式有限黑箱候选族的条件决策树与固定查询集合；v3.3 的默认族给出严格优势，配套对照族给出无优势结果。两者都只在声明的候选、查询和无噪声假设内成立。

`parametric_branching_family.js` 将分支结构表示为有限运行区间和局部响应的生成族。它同时计算预先声明的深度关系，并调用精确查询搜索交叉验证；v3.4 的 benchmark 按参数配置划分 calibration 与 holdout，而不是从这些配置中拟合模型。

`piecewise_map_family.js` 进一步把候选表示为二维分段整数映射：原点区域编码运行区间，匹配的局部区域编码响应，其余状态落入背景区域。查询设计引擎只接收映射求值后的转移，v3.5 基准用于检验该表示是否保留反馈优势。

`piecewise_map_inference.js` 在该映射族上枚举候选参数，从训练状态转移筛选，再用留出转移淘汰错误候选；若仍有歧义，则把剩余候选交给条件查询设计。它明确区分唯一恢复、可主动消歧和训练/留出冲突。

根目录的 `dynamics_invariant.js`、`dynamics_invariant_verifier.js` 和 `decoder_blackbox_dynamics.js` 是此目录模块依赖的稳定基础。`dynamics_composed_search.js` 是负对照。
