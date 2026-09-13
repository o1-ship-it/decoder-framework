// Finite recovery of piecewise-map parameters from observed black-box transitions.

const queryDesign = require("./branching_query_design.js");
const mapFamily = require("./piecewise_map_family.js");

const MAX_TRANSITIONS_PER_SPLIT = 12;

function vectorKey(vector) { return JSON.stringify(vector); }

function sameVector(left, right) {
  return vectorKey(left) === vectorKey(right);
}

function normalizeTransition(transition, split, index) {
  if (!transition || typeof transition !== "object" || Array.isArray(transition)) throw new TypeError(`${split} 转移 ${index} 必须是对象`);
  if (!Array.isArray(transition.state) || transition.state.length !== 2 || !transition.state.every(Number.isSafeInteger)) throw new TypeError(`${split} 转移 ${index} 的状态必须是二维安全整数`);
  if (!Array.isArray(transition.next) || transition.next.length !== 2 || !transition.next.every(Number.isSafeInteger)) throw new TypeError(`${split} 转移 ${index} 的后继必须是二维安全整数`);
  return { state: [...transition.state], next: [...transition.next] };
}

function normalizeSplit(transitions, split) {
  if (!Array.isArray(transitions) || transitions.length < 1 || transitions.length > MAX_TRANSITIONS_PER_SPLIT) throw new RangeError(`${split} 转移数必须在 1..${MAX_TRANSITIONS_PER_SPLIT}`);
  return transitions.map((transition, index) => normalizeTransition(transition, split, index));
}

function normalizeInput(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("分段映射恢复输入必须是对象");
  return {
    options: mapFamily.normalizeOptions(raw.options || {}),
    training: normalizeSplit(raw.training, "训练"),
    holdout: normalizeSplit(raw.holdout, "留出"),
  };
}

function decorateModels(options) {
  const family = mapFamily.makeFamily(options);
  return {
    queries: family.queries,
    models: family.models.map(model => ({ ...model, transitions: mapFamily.materializeTransitions(model, family.queries) })),
  };
}

function consistentModels(models, transitions) {
  return models.filter(model => transitions.every(transition => sameVector(mapFamily.evaluateMap(model, transition.state), transition.next)));
}

function recoverParameters(models) {
  const regions = [...new Set(models.map(model => model.region))].sort((left, right) => left - right);
  const responses = [...new Set(models.map(model => model.response))].sort((left, right) => left - right);
  return {
    candidateCount: models.length,
    possibleRegions: regions,
    possibleResponses: responses,
    region: regions.length === 1 ? regions[0] : null,
    response: responses.length === 1 ? responses[0] : null,
    candidateIds: models.map(model => model.id),
  };
}

function observedQueryIds(transitions, queries) {
  const seen = new Set(transitions.map(transition => vectorKey(transition.state)));
  return queries.filter(query => seen.has(vectorKey(query.state))).map(query => query.id);
}

function makeActiveDesign(models, queries, observedIds) {
  if (models.length < 2) return null;
  const remainingQueries = queries.filter(query => !observedIds.includes(query.id));
  if (!remainingQueries.length) return {
    status: "unresolved_finite_family",
    candidateCount: models.length,
    queryCount: 0,
    adaptive: { depth: null, reason: "all_declared_queries_already_observed" },
    fixed: { depth: null, queries: [], witnessCount: 0 },
  };
  return queryDesign.analyze(models, remainingQueries);
}

function analyze(raw = {}) {
  const input = normalizeInput(raw);
  const generated = decorateModels(input.options);
  const afterTraining = consistentModels(generated.models, input.training);
  const trainingRecovery = recoverParameters(afterTraining);
  const base = {
    schemaVersion: 1,
    decoder: "piecewise_map_inference",
    family: "piecewise_origin_local_response",
    options: input.options,
    input,
    initialCandidateCount: generated.models.length,
    stages: { training: trainingRecovery, holdout: null },
    activeDesign: null,
    limits: [
      "区域语义、分段映射形式和候选参数边界由研究者预先声明",
      `候选数不超过 ${queryDesign.MAX_MODELS}，查询数不超过 ${queryDesign.MAX_QUERIES}`,
      `训练和留出转移各不超过 ${MAX_TRANSITIONS_PER_SPLIT} 条，且均为无噪声二维整数转移`,
      "主动设计只在通过已观测转移的剩余有限候选上计算最坏情况深度",
      "候选唯一只表示在声明的映射族和有限观测内冻结，不外推到未知分段边界、噪声或通用动力系统",
    ],
  };
  if (!afterTraining.length) return {
    ...base,
    status: "counterexample_found",
    failure: { stage: "training", reason: "no_declared_piecewise_map_matches_training" },
    stages: { training: trainingRecovery, holdout: recoverParameters([]) },
  };

  const afterHoldout = consistentModels(afterTraining, input.holdout);
  const holdoutRecovery = recoverParameters(afterHoldout);
  if (!afterHoldout.length) return {
    ...base,
    status: "counterexample_found",
    failure: { stage: "holdout", reason: "training_consistent_maps_fail_holdout" },
    stages: { training: trainingRecovery, holdout: holdoutRecovery },
  };

  if (afterHoldout.length === 1) return {
    ...base,
    status: "candidate_frozen",
    stages: { training: trainingRecovery, holdout: holdoutRecovery },
  };

  const observedIds = observedQueryIds(input.training.concat(input.holdout), generated.queries);
  const activeDesign = makeActiveDesign(afterHoldout, generated.queries, observedIds);
  return {
    ...base,
    status: activeDesign.status === "unresolved_finite_family" ? "ambiguous_unresolved" : "ambiguous_with_active_plan",
    stages: { training: trainingRecovery, holdout: holdoutRecovery },
    observedQueryIds: observedIds,
    activeDesign,
  };
}

function makeCertificate(raw = {}) {
  const input = normalizeInput(raw);
  return { schemaVersion: 1, claim: "piecewise_map_inference", input, result: analyze(input) };
}

function verifyCertificate(certificate) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "piecewise_map_inference") return { status: "invalid_certificate" };
    const replay = analyze(certificate.input);
    if (JSON.stringify(replay) !== JSON.stringify(certificate.result)) return { status: "invalid_certificate", reason: "分段映射恢复证书无法重放" };
    return {
      status: "verified_piecewise_map_inference",
      analysisStatus: replay.status,
      initialCandidateCount: replay.initialCandidateCount,
      trainingCandidateCount: replay.stages.training.candidateCount,
      holdoutCandidateCount: replay.stages.holdout.candidateCount,
      activeStatus: replay.activeDesign?.status || null,
    };
  } catch (error) {
    return { status: "invalid_certificate", reason: error.message };
  }
}

module.exports = {
  MAX_TRANSITIONS_PER_SPLIT,
  vectorKey,
  sameVector,
  normalizeTransition,
  normalizeSplit,
  normalizeInput,
  decorateModels,
  consistentModels,
  recoverParameters,
  observedQueryIds,
  makeActiveDesign,
  analyze,
  makeCertificate,
  verifyCertificate,
};
