# Decoder Framework v1.7

v1.7 新增多机制竞争器，比较 arithmetic、periodic、affine 与 modular affine 候选。系统把“多个候选同样解释数据”标记为 `ambiguous_hidden_structure`，把没有候选的情况标记为 `uncertain_hidden_structure`，只有单一候选在留出集精确通过时才标记为 `verified_unique_hidden_structure`。

每个结果保留候选排名、复杂度代理、留出残差、stress 残差和证书重放接口。benchmark 覆盖唯一识别、不可识别和未知三类情形。
