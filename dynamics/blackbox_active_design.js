// Active evidence design for a finite family of linear two-dimensional maps.

const crypto = require("node:crypto");
const blackbox = require("../decoder_blackbox_dynamics.js");

function normalizeOptions(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("主动设计选项必须是对象");
  const maxMapDegree = options.maxMapDegree ?? 1;
  const coefficientRange = options.coefficientRange ?? 1;
  const stateMin = options.stateMin ?? -2;
  const stateMax = options.stateMax ?? 2;
  if (maxMapDegree !== 1) throw new RangeError("当前主动设计只支持一次映射");
  if (!Number.isSafeInteger(coefficientRange) || coefficientRange < 0 || coefficientRange > 1) throw new RangeError("主动设计系数范围必须在 0..1");
  if (!Number.isSafeInteger(stateMin) || !Number.isSafeInteger(stateMax) || stateMin > stateMax || stateMin < -4 || stateMax > 4) throw new RangeError("候选状态边界必须在 -4..4");
  return { maxMapDegree, coefficientRange, stateMin, stateMax };
}

function validateTransitions(transitions) {
  if (!Array.isArray(transitions) || transitions.length < 1) throw new TypeError("主动设计至少需要一条训练转移");
  for (const row of transitions) {
    if (!row || !Array.isArray(row.state) || !Array.isArray(row.next) || row.state.length !== 2 || row.next.length !== 2 || !row.state.concat(row.next).every(Number.isSafeInteger)) throw new TypeError("训练转移格式无效");
  }
}

function coefficientVectors(length, range) {
  const values = [];
  function visit(index, vector) {
    if (index === length) { values.push(vector); return; }
    for (let coefficient = -range; coefficient <= range; coefficient += 1) visit(index + 1, vector.concat(coefficient));
  }
  visit(0, []);
  return values;
}

function terms(coefficients, powers) {
  return coefficients.flatMap((coefficient, index) => coefficient === 0 ? [] : [{ coefficient, powers: powers[index] }]);
}

function mapKey(map) {
  return JSON.stringify([map.xCoefficients, map.yCoefficients]);
}

function buildCandidates(options) {
  options = normalizeOptions(options);
  const powers = blackbox.basis(options.maxMapDegree);
  const vectors = coefficientVectors(powers.length, options.coefficientRange);
  const candidates = [];
  for (const xCoefficients of vectors) for (const yCoefficients of vectors) {
    candidates.push({
      xCoefficients,
      yCoefficients,
      map: { x: terms(xCoefficients, powers), y: terms(yCoefficients, powers) },
    });
  }
  return { powers, candidates };
}

function predict(candidate, state) {
  const output = predictExact(candidate, state).map(Number);
  if (!output.every(Number.isSafeInteger)) throw new RangeError("预测超出安全整数范围");
  return output;
}

function predictExact(candidate, state) {
  return [candidate.map.x, candidate.map.y].map(polynomial => polynomial.reduce((sum, term) =>
    sum + BigInt(term.coefficient) * BigInt(state[0]) ** BigInt(term.powers[0]) * BigInt(state[1]) ** BigInt(term.powers[1]), 0n));
}

function fits(candidate, training) {
  return training.every(row => {
    const output = predictExact(candidate, row.state);
    return output[0] === BigInt(row.next[0]) && output[1] === BigInt(row.next[1]);
  });
}

function digest(candidates) {
  return crypto.createHash("sha256").update(candidates.map(mapKey).join("\n")).digest("hex");
}

function compareState(left, right) {
  return left[0] - right[0] || left[1] - right[1];
}

function comparePrediction(left, right) {
  return left[0] - right[0] || left[1] - right[1];
}

function stateCandidates(options, observed) {
  const states = [];
  for (let x = options.stateMin; x <= options.stateMax; x += 1) for (let y = options.stateMin; y <= options.stateMax; y += 1) {
    const state = [x, y];
    if (!observed.has(JSON.stringify(state))) states.push(state);
  }
  return states;
}

function splitAt(state, candidates) {
  const groups = new Map();
  for (const candidate of candidates) {
    const next = predict(candidate, state);
    const key = JSON.stringify(next);
    groups.set(key, (groups.get(key) || 0) + 1);
  }
  const partitions = [...groups.entries()].map(([key, count]) => ({ next: JSON.parse(key), count })).sort((a, b) => comparePrediction(a.next, b.next));
  const total = candidates.length;
  const largestGroup = Math.max(...partitions.map(group => group.count));
  const expectedRemaining = partitions.reduce((sum, group) => sum + group.count ** 2, 0) / total;
  const entropyBits = partitions.reduce((sum, group) => { const probability = group.count / total; return sum - probability * Math.log2(probability); }, 0);
  return { state, partitions, groupCount: partitions.length, largestGroup, guaranteedEliminated: total - largestGroup, expectedRemaining, entropyBits };
}

function design(training, rawOptions = {}) {
  validateTransitions(training);
  const options = normalizeOptions(rawOptions);
  const { powers, candidates: universe } = buildCandidates(options);
  const candidates = universe.filter(candidate => fits(candidate, training));
  const result = {
    decoder: "blackbox_active_observation_design",
    candidateCount: candidates.length,
    candidateDigest: digest(candidates),
    mapBasis: powers,
    limits: ["二维一次整数多项式映射", `每个系数绝对值≤${options.coefficientRange}`, `候选状态坐标在[${options.stateMin},${options.stateMax}]`, "候选均匀权重只用于选择观测，不是概率结论", "排除保证以真实映射在声明空间内且观测无噪声为前提", "空版本空间只反驳声明的模型族，唯一候选不证明真实系统全局唯一"],
  };
  if (candidates.length === 0) return { ...result, status: "counterexample_found", residual: 1, recommendation: null, frontier: [] };
  if (candidates.length === 1) return { ...result, status: "identified_blackbox_map", residual: 0, inferredMap: candidates[0].map, recommendation: null, frontier: [] };

  const observed = new Set(training.map(row => JSON.stringify(row.state)));
  const frontier = stateCandidates(options, observed).map(state => splitAt(state, candidates));
  const ranked = frontier.slice().sort((left, right) => right.guaranteedEliminated - left.guaranteedEliminated || left.expectedRemaining - right.expectedRemaining || right.entropyBits - left.entropyBits || compareState(left.state, right.state));
  const recommendation = ranked[0] || null;
  if (!recommendation || recommendation.guaranteedEliminated === 0) return { ...result, status: "uncertain_no_discriminating_observation", residual: null, recommendation: null, frontier };
  return { ...result, status: "active_blackbox_observation_plan", residual: null, recommendation, frontier };
}

function makeCertificate(training, options = {}) {
  const normalized = normalizeOptions(options);
  return { schemaVersion: 1, claim: "blackbox_active_observation_design", training, options: normalized, result: design(training, normalized) };
}

function verifyCertificate(certificate) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "blackbox_active_observation_design") return { status: "invalid_certificate" };
    const replay = design(certificate.training, certificate.options);
    if (JSON.stringify(replay) !== JSON.stringify(certificate.result)) return { status: "invalid_certificate", reason: "黑箱主动观测证书无法重放" };
    return { status: replay.status, candidateCount: replay.candidateCount, recommendation: replay.recommendation || null };
  } catch (error) {
    return { status: "invalid_certificate", reason: error.message };
  }
}

module.exports = { normalizeOptions, coefficientVectors, buildCandidates, predict, fits, digest, splitAt, design, makeCertificate, verifyCertificate };
