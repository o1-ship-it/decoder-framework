// Failure-directed search over composed decoder families.

const generator = require("./decoder_generator.js");
const failure = require("./decoder_failure_analysis.js");

function adaptiveSynthesize(sequence, options = {}) {
  const maxOrder = options.maxOrder ?? 3;
  const splitSizes = options.splitSizes ?? [8, 10, 12];
  if (!Number.isSafeInteger(maxOrder) || maxOrder < 0 || maxOrder > 3) throw new RangeError("最大差分阶数必须为 0..3");
  const rounds = [];
  for (let order = 0; order <= maxOrder; order += 1) {
    const synthesis = generator.synthesize(sequence, splitSizes, order);
    const best = synthesis.best;
    const round = {
      order,
      status: synthesis.status,
      best: best ? { name: best.name, exactRate: best.exactRate, averageError: best.averageError, eligible: best.eligible } : null,
      reason: best?.eligible ? "通过当前验证" : "当前表示空间没有稳定候选",
    };
    rounds.push(round);
    if (synthesis.status === "candidate_frozen") return { ...synthesis, rounds, selectedOrder: order };
  }
  return { status: "uncertain", rounds, selectedOrder: null, suggestion: "扩大表示变换或增加独立观测" };
}

function adaptiveTransfer(plan, targets, trainSize = 12, horizon = 4) {
  return targets.map((target, variant) => ({ variant, diagnosis: failure.diagnose(plan, target, trainSize, horizon) }));
}

module.exports = { adaptiveSynthesize, adaptiveTransfer };
