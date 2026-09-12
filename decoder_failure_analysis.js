// Explain why a frozen composed decoder failed on a target object.

const generator = require("./decoder_generator.js");

function diagnose(plan, target, trainSize = 12, horizon = 4) {
  if (typeof plan !== "function") throw new TypeError("需要一个已冻结的解码器计划");
  if (!Array.isArray(target) || target.length < trainSize + horizon) throw new RangeError("目标序列长度不足");
  const train = target.slice(0, trainSize);
  const hidden = target.slice(trainSize, trainSize + horizon);
  const prediction = plan(train, horizon);
  if (!prediction.valid) {
    return { status: "representation_mismatch", reason: "变换后的数据无法被基础推理器拟合", action: "尝试另一种表示变换或扩大解码器族" };
  }
  const errors = prediction.predicted.map((value, index) => value - hidden[index]);
  const firstMismatch = errors.findIndex(error => error !== 0);
  if (firstMismatch < 0) return { status: "passed", action: "保持当前解码器计划", prediction: prediction.predicted };
  const trainFit = plan(train, 0).valid;
  if (trainFit) {
    return {
      status: "extrapolation_failure",
      reason: "基础模型能解释训练前缀，但在留出段出现偏离",
      action: "检查分布变化、反馈反例，必要时冻结为不确定",
      firstMismatch: trainSize + firstMismatch + 1,
      errors,
      prediction: prediction.predicted,
      expected: hidden,
    };
  }
  return { status: "fit_failure", reason: "训练阶段本身未通过", action: "更换表示或推理规则", errors };
}

function candidateSuggestions(target) {
  const names = generator.synthesize(target.slice(0, 16), [8, 10, 12], 2).ranking.slice(0, 5).map(item => ({ name: item.name, exactRate: item.exactRate, averageError: item.averageError, eligible: item.eligible }));
  return names;
}

module.exports = { diagnose, candidateSuggestions };
