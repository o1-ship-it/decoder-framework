// Finite certificate that two queries are optimal for a bounded linear map family.

const active = require("./blackbox_active_design.js");

function normalizeOptions(options = {}) {
  const coefficientRange = options.coefficientRange ?? 1;
  if (!Number.isSafeInteger(coefficientRange) || coefficientRange < 1 || coefficientRange > 2) throw new RangeError("系数范围必须在 1..2");
  return { coefficientRange };
}

function coefficientVectors(range) {
  const output = [];
  for (let a = -range; a <= range; a += 1) for (let b = -range; b <= range; b += 1)
    for (let c = -range; c <= range; c += 1) for (let d = -range; d <= range; d += 1) output.push([a, b, c, d]);
  return output;
}

function observe(coefficients, state) {
  const [a, b, c, d] = coefficients;
  return [a * state[0] + b * state[1], c * state[0] + d * state[1]];
}

function signature(coefficients, queries) { return queries.map(state => observe(coefficients, state).join(",")).join("|"); }
function distinguishesAll(candidates, queries) { return new Set(candidates.map(candidate => signature(candidate, queries))).size === candidates.length; }
function candidateOutputCount(candidates, state) { return new Set(candidates.map(candidate => observe(candidate, state).join(","))).size; }

function axes() { return [[1, 0], [0, 1]]; }

function prove(options = {}) {
  const normalized = normalizeOptions(options);
  const candidates = coefficientVectors(normalized.coefficientRange);
  const candidateCount = candidates.length;
  const oneQuery = axes().map(state => ({ state, distinctOutputs: candidateOutputCount(candidates, state) }));
  const maxOneQueryOutputs = Math.max(...oneQuery.map(item => item.distinctOutputs));
  const upperBoundQueries = distinguishesAll(candidates, axes()) ? 2 : null;
  const lowerBoundQueries = maxOneQueryOutputs < candidateCount ? 2 : 1;
  return {
    schemaVersion: 1,
    claim: "linear_query_optimality",
    family: "bounded_integer_linear_2x2",
    options: normalized,
    candidateCount,
    oneQuery,
    maxOneQueryOutputs,
    lowerBoundQueries,
    witnessQueries: axes(),
    upperBoundQueries,
    optimalQueryCount: lowerBoundQueries === upperBoundQueries ? lowerBoundQueries : null,
    adaptiveLowerBound: lowerBoundQueries,
    limits: ["有限系数候选族；不含平移项", "查询状态为整数向量且输出无噪声", "自适应下界只使用单次查询的最大输出分辨率", "结论不外推到非线性、噪声或候选族外系统"],
  };
}

function verify(proof) {
  try {
    if (!proof || proof.schemaVersion !== 1 || proof.claim !== "linear_query_optimality") return { status: "invalid_certificate" };
    const replay = prove(proof.options);
    return JSON.stringify(replay) === JSON.stringify(proof) ? { status: "verified_linear_query_optimality", optimalQueryCount: replay.optimalQueryCount } : { status: "invalid_certificate", reason: "线性查询下界证书无法重放" };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

module.exports = { normalizeOptions, coefficientVectors, observe, signature, distinguishesAll, candidateOutputCount, axes, prove, verify };
