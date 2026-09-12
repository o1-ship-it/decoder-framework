// Development-data selection only. Final test values must never enter this module.

const base = require("./decoder_benchmark.js");
const { createHash } = require("node:crypto");

function recurrenceWithRange(maxCoefficient) {
  return function generatedRecurrence(train, horizon) {
    if (train.length < 3) return { name: `recurrence±${maxCoefficient}`, descriptionLength: Infinity, predicted: [], valid: false, note: "样本不足" };
    for (let a = -maxCoefficient; a <= maxCoefficient; a += 1) {
      for (let b = -maxCoefficient; b <= maxCoefficient; b += 1) {
        let valid = true;
        for (let i = 2; i < train.length; i += 1) {
          if (train[i] !== a * train[i - 1] + b * train[i - 2]) { valid = false; break; }
        }
        if (valid) {
          const predicted = [];
          let x0 = train[train.length - 2];
          let x1 = train[train.length - 1];
          for (let i = 0; i < horizon; i += 1) {
            const next = a * x1 + b * x0;
            predicted.push(next);
            x0 = x1;
            x1 = next;
          }
          return { name: `recurrence±${maxCoefficient}`, descriptionLength: 4 + Math.log2(maxCoefficient + 1), predicted, valid: true, note: `xₙ=${a}xₙ₋₁+(${b})xₙ₋₂`, model: { kind: "linear_recurrence", coefficients: [a, b], initial: train.slice(0, 2) } };
        }
      }
    }
    return { name: `recurrence±${maxCoefficient}`, descriptionLength: Infinity, predicted: [], valid: false, note: "未发现递推" };
  };
}

function differenceRecurrenceDecoder(train, horizon) {
  if (train.length < 4) return { name: "difference→recurrence", descriptionLength: Infinity, predicted: [], valid: false, note: "样本不足" };
  const differences = train.slice(1).map((value, i) => value - train[i]);
  for (let a = -5; a <= 5; a += 1) {
    for (let b = -5; b <= 5; b += 1) {
      let valid = true;
      for (let i = 2; i < differences.length; i += 1) {
        if (differences[i] !== a * differences[i - 1] + b * differences[i - 2]) { valid = false; break; }
      }
      if (valid) {
        const predicted = [];
        let d0 = differences[differences.length - 2];
        let d1 = differences[differences.length - 1];
        let value = train[train.length - 1];
        for (let i = 0; i < horizon; i += 1) {
          const nextDifference = a * d1 + b * d0;
          value += nextDifference;
          predicted.push(value);
          d0 = d1;
          d1 = nextDifference;
        }
        return { name: "difference→recurrence", descriptionLength: 6, predicted, valid: true, note: `Δxₙ=${a}Δxₙ₋₁+(${b})Δxₙ₋₂`, model: { kind: "difference_recurrence", coefficients: [a, b], initial: train.slice(0, 3) } };
      }
    }
  }
  return { name: "difference→recurrence", descriptionLength: Infinity, predicted: [], valid: false, note: "差分中未发现递推" };
}

function inferDiagnostics(sequence) {
  // Only positions 0..7 are used to decide which candidate families to add.
  const train = sequence.slice(0, 6);
  const hidden = sequence.slice(6, 8);
  return base.decoders.map(decoder => {
    const prediction = decoder(train, hidden.length);
    if (!prediction.valid) return `${prediction.name}:失配`;
    const error = mae(prediction.predicted, hidden);
    return error !== 0 ? `${prediction.name}:外推失败` : `${prediction.name}:样本通过`;
  });
}

function generateCandidates(diagnostics = []) {
  const candidates = [...base.decoders];
  if (diagnostics.some(item => item.includes("recurrence:失配"))) candidates.push(recurrenceWithRange(12));
  if (diagnostics.some(item => item.includes("外推失败"))) candidates.push(differenceRecurrenceDecoder);
  return candidates;
}

function mae(predicted, expected) {
  if (predicted.length !== expected.length || expected.length === 0) return Infinity;
  return predicted.reduce((sum, value, i) => sum + Math.abs(value - expected[i]), 0) / expected.length;
}

function validateDevelopment(sequence, splitSizes) {
  if (!Array.isArray(sequence) || sequence.length < 10 || !sequence.every(Number.isSafeInteger)) {
    throw new TypeError("开发数据必须包含至少 10 个 JavaScript 安全整数");
  }
  if (!Array.isArray(splitSizes) || splitSizes.length < 2 || splitSizes.some((size, i) =>
    !Number.isSafeInteger(size) || size < 8 || size + 2 > sequence.length || (i > 0 && size < splitSizes[i - 1] + 2))) {
    throw new RangeError("至少需要两次不重叠验证：训练长度从 8 开始，每次保留两个验证值");
  }
}

function evaluateAcrossSplits(sequence, splitSizes = [8, 10, 12]) {
  validateDevelopment(sequence, splitSizes);
  const diagnostics = inferDiagnostics(sequence);
  const candidates = generateCandidates(diagnostics);
  return candidates.map(decoder => {
    const trials = splitSizes.map(trainSize => {
      const train = sequence.slice(0, trainSize);
      const hidden = sequence.slice(trainSize, trainSize + 2);
      const prediction = decoder(train, hidden.length);
      const valid = prediction.valid && prediction.predicted.length === 2 && prediction.predicted.every(Number.isSafeInteger);
      const error = valid ? mae(prediction.predicted, hidden) : Infinity;
      return { trainSize, valid, error, exact: error === 0, descriptionLength: prediction.descriptionLength, name: prediction.name };
    });
    const validTrials = trials.filter(trial => trial.valid);
    const averageError = validTrials.length ? validTrials.reduce((sum, trial) => sum + trial.error, 0) / validTrials.length : Infinity;
    const fitRate = validTrials.length / trials.length;
    const passRate = trials.filter(trial => trial.exact).length / trials.length;
    const finiteLengths = validTrials.map(trial => trial.descriptionLength).filter(Number.isFinite);
    const descriptionLength = finiteLengths.length ? finiteLengths.reduce((sum, cost) => sum + cost, 0) / finiteLengths.length : Infinity;
    const score = descriptionLength + 10 * averageError + (1 - fitRate) * 20;
    // Exact integer sequences: eligibility requires every development trial to pass.
    return { name: trials[0].name, score, averageError, fitRate, passRate, eligible: passRate === 1, trials, diagnostics };
  }).sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (!Number.isFinite(a.score) && !Number.isFinite(b.score)) return 0;
    if (!Number.isFinite(a.score)) return 1;
    if (!Number.isFinite(b.score)) return -1;
    return a.score - b.score;
  });
}

function createCertificate(development, horizon, splitSizes = [8, 10, 12]) {
  if (!Number.isSafeInteger(horizon) || horizon < 1 || horizon > 1000) throw new RangeError("最终测试长度必须为 1..1000");
  const ranking = evaluateAcrossSplits(development, splitSizes);
  const best = ranking[0];
  if (!best?.eligible) return { status: "uncertain", ranking, certificate: null };
  const decoder = generateCandidates(best.diagnostics).find(candidate => candidate(development, 0).name === best.name);
  // Freeze both the fitted rule and its forecast before any final observations arrive.
  const fitted = decoder(development, horizon);
  if (!fitted.valid || fitted.predicted.length !== horizon || !fitted.predicted.every(Number.isSafeInteger)) {
    return { status: "uncertain", reason: "重拟合失败或预测超出安全整数范围", ranking, certificate: null };
  }
  const canonical = development.map(String);
  const certificate = {
    schemaVersion: 2,
    claim: "finite_sample_hypothesis",
    arithmetic: "exact_integer",
    decoder: best.name,
    rule: fitted.note,
    model: fitted.model,
    developmentLength: development.length,
    developmentSha256: createHash("sha256").update(JSON.stringify(canonical)).digest("hex"),
    forecast: fitted.predicted.map(String),
    selection: { diagnostics: best.diagnostics, splits: splitSizes.slice(), horizon: 2, passRate: best.passRate },
    complexity: { value: fitted.descriptionLength, unit: "heuristic_proxy_not_bits" },
    limits: ["有限整数序列；无噪声；预测精确相等", "验证通过只涉及提供的有限观测，不构成无限序列定理", "学习与候选搜索为人工设定的有限规则集合"],
  };
  return { status: "candidate_frozen", ranking, certificate };
}

module.exports = { evaluateAcrossSplits, generateCandidates, createCertificate, differenceRecurrenceDecoder, recurrenceWithRange };

if (require.main === module) require("./decoder_experiment.js").main();
