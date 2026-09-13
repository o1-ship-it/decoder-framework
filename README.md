# Decoder Framework v1.0

项目状态与路线见 [PROJECT_STATUS.md](PROJECT_STATUS.md)。
项目北极星目标见 [PROJECT_NORTH_STAR.md](PROJECT_NORTH_STAR.md)。
v3 研究策略见 [RESEARCH_STRATEGY_v3.md](RESEARCH_STRATEGY_v3.md)。
项目阶段性审视见 [PROJECT_REVIEW_v1_7.md](PROJECT_REVIEW_v1_7.md)。
最新研究反思见 [RESEARCH_REFLECTION_v2_4.md](RESEARCH_REFLECTION_v2_4.md)。
研究反思见 [RESEARCH_REFLECTION_v2_2.md](RESEARCH_REFLECTION_v2_2.md)。
第一版发布说明见 [RELEASE_NOTES_v1.md](RELEASE_NOTES_v1.md)。
升级路线见 [RESEARCH_ROADMAP.md](RESEARCH_ROADMAP.md)。

这是一个把“表示—推理—反馈—验证”落实为实验系统的最小版本。

## 统一入口

`decoder_v1.js` 接受带 `domain` 的 JSON 对象，支持：

- `sequence`：已有开发前缀和留出后缀；
- `generated_sequence`：自动搜索表示变换和基础解码器；
- `graph`：有限无向图不变量；
- `equation`：整数线性方程规范化；
- `equation_system`：精确有理数 RREF 和消元结论。
- `polynomial`：稀疏整数多项式规范化与同类项合并。
- `polynomial_factor`：低次数首一单变量多项式的整数根因式分解。
- `polynomial_analysis`：变量支持、次数、齐次性和欧拉恒等式分析。
- `dynamics`：二维多项式映射中的有限次数守恒量搜索。
- `dynamics_parameterized`：带参数旋转缩放族的守恒量条件发现。
- `noisy_sequence`：带有限加性噪声的鲁棒数列解码与拒答。
- `active_observation_design`：在有限候选空间内选择最能减少歧义的下一观测。
- `noisy_active_observation_design`：按有界噪声区间的最坏重叠选择稳健观测。
- `hidden_sequence`：从原始序列搜索模仿射递推，并用留出数据和证书重放验证隐藏生成机制。

v1.2 发布说明见 [RELEASE_NOTES_v1_2.md](RELEASE_NOTES_v1_2.md)。

动力系统结果通过 `dynamics_invariant_verifier.js` 独立重放搜索，并检查候选的符号恒等式和固定整数轨道点。支持 `method:"linear_nullspace"` 在给定次数空间内直接求解不变量线性空间，也保留 `method:"enumeration"` 作为有限系数对照。搜索范围内没有非平凡候选时返回“不确定”；这不表示整个函数空间不存在守恒量。

程序会返回解码器、表示、候选结构、复杂度、残差、验证状态和适用边界。未知对象保留为不确定，不会强行输出规律。

`conjecture_engine.js` 还可把已验证的守恒量转换成带搜索边界的有限猜想，并提供候选映射上的反例检查。

动力系统结果还包含 `readability.machine` 和 `readability.human`：前者记录机器内部解码摘要，后者提供可沟通的规则文本。内部表示可以不透明，但必须能被验证器重算。

## 运行

单个对象：

```text
echo {"domain":"equation","equation":{"terms":{"x":6,"y":-3},"constant":9}} | node decoder_v1.js
```

批量对象：把 JSON 数组传给同一入口，返回每项结果及汇总统计。

## 研究边界

当前实现面向小型、无噪声、整数或有限图对象。复杂度是排序用的代理值；证书和验证结果支持有限样本假设，不自动构成无限数学定理。图规范化目前只适用于不超过 8 个顶点。

dynamics_family.js 可从多个参数样本中提取共同守恒量，并在新参数实例上验证迁移结果。

dynamics_condition_inference.js 可从参数样本上的守恒残差推导低阶参数方程，并在额外样本上检查拟合残差。

参数条件推导要求至少 6 个拟合样本加 1 个留出样本，并分别报告拟合与留出残差。

参数条件模块还包含高阶扰动压力测试：拟合点全部正常、留出参数失效时，generalizes=false。

参数条件证书会区分 verified_parameter_condition 与 overfit_candidate，并可由独立验证器在新参数样本上重算。

参数条件推导支持多个状态点联合检查：只有满足参数条件的样本在所有状态点上都保持不变量，结果才可标记为已验证。

decoder_report.js 为不同信息域生成分域评价报告，统一列出验证强度、残差、复杂度以及机器 / 人类可读性；不会把代理指标合并成虚假的总分。

运行 `node decoder_acceptance.js` 可执行第一版端到端验收，结果写入 decoder_acceptance_v1.json。

运行 `npm run benchmark:v1.2` 可执行 v1.2 带噪 benchmark。

dynamics_condition_general.js 提供一参数一次条件推导原型，用于逐步扩展参数化解码器。

dynamics_condition_general.js 现在支持单参数低阶多项式条件，例如从残差恢复 c^2-1=0，并要求留出样本验证。

参数条件扩展还支持双参数一次关系，可从样本恢复 a+b-1=0 一类条件。

参数条件结果还报告 fitResidualMax、holdoutResidualMax 和 identifiable，便于比较证据强度。

单参数一次条件现在也遵循数据隔离：前 2 个样本拟合，后续样本留出验证。

运行 `node dynamics_condition_experiment.js` 可复现参数条件拟合与高阶扰动压力测试，并生成 dynamics_condition_v0_1.json。

总体验收报告现在同时包含参数条件扩展检查，并确认正常条件通过、高阶扰动被拒绝。

运行 `node decoder_audit.js` 可独立审计验收报告中的未知、反例和已验证结果分类。

审计器还会核对分域汇总与明细，能够发现统计摘要被篡改。

decoder_manifest.js 为核心源码和验收报告生成 SHA-256 可复现清单，并支持完整性复核。

decoder_resource_profile.js 可记录各解码器运行时间、状态和候选规模，为计算成本指标提供数据。

总体验收还会记录前三个代表任务的资源剖面，并确认没有执行错误。

公开基准：enchmark_v1.json；运行 
ode benchmark_runner.js 生成 enchmark_v1_results.json。

dynamics_condition_multivariate.js 支持任意命名参数的一次条件推导，并在样本秩不足时拒答。

v1.3 发布说明见 [RELEASE_NOTES_v1_3.md](RELEASE_NOTES_v1_3.md)。
v1.4 发布说明见 [RELEASE_NOTES_v1_4.md](RELEASE_NOTES_v1_4.md)。
v1.5 发布说明见 [RELEASE_NOTES_v1_5.md](RELEASE_NOTES_v1_5.md)。
v1.6 发布说明见 [RELEASE_NOTES_v1_6.md](RELEASE_NOTES_v1_6.md)。
v1.7 发布说明见 [RELEASE_NOTES_v1_7.md](RELEASE_NOTES_v1_7.md)。
v2.0 发布说明见 [RELEASE_NOTES_v2_0.md](RELEASE_NOTES_v2_0.md)。
v2.1 发布说明见 [RELEASE_NOTES_v2_1.md](RELEASE_NOTES_v2_1.md)。
v2.2 发布说明见 [RELEASE_NOTES_v2_2.md](RELEASE_NOTES_v2_2.md)。
v2.3 发布说明见 [RELEASE_NOTES_v2_3.md](RELEASE_NOTES_v2_3.md)。
v2.4 发布说明见 [RELEASE_NOTES_v2_4.md](RELEASE_NOTES_v2_4.md)。

运行 `npm run benchmark:v1.6` 可复现隐藏结构发现基准。搜索范围内没有稳定候选时返回 `uncertain_hidden_structure`，不把有限样本拟合误报为定理。
运行 `npm run benchmark:v1.7` 可复现多机制竞争基准。多个候选精确通过时返回 `ambiguous_hidden_structure`，避免把模型选择偏好误写成唯一解释。
运行 `npm run benchmark:v2.0` 可复现能力矩阵。校准任务与测试任务分离，并报告覆盖率、选择性风险、标签准确率和 Brier 分数。
运行 `npm run benchmark:v2.1` 可复现可识别性前沿实验，报告候选机制最早分歧位置和建议新增观测数。
运行 `npm run benchmark:v2.2` 可复现主动实验设计，选择最能减少候选歧义的下一观测位置。
运行 `npm run benchmark:v2.3` 可复现有界噪声下的主动设计，按区间重叠给出保守的保证排除数。
运行 `npm run benchmark:v2.4` 可复现观测等价类分析，区分机制候选数与可观测预测类数。
dynamics_condition_multivariate 支持多参数一次条件推导与秩不足拒答。
