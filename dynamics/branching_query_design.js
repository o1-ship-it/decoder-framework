// Exact adaptive versus fixed query design for finite black-box transition families.

const MAX_MODELS = 16;
const MAX_QUERIES = 12;

function validate(models, queries) {
  if (!Array.isArray(models) || models.length < 2) throw new TypeError("至少需要两个候选黑箱系统");
  if (!Array.isArray(queries) || queries.length < 1) throw new TypeError("至少需要一个可查询状态");
  if (models.length > MAX_MODELS) throw new RangeError(`候选黑箱系统不能超过 ${MAX_MODELS} 个`);
  if (queries.length > MAX_QUERIES) throw new RangeError(`可查询状态不能超过 ${MAX_QUERIES} 个`);
  const queryIds = new Set();
  for (const query of queries) {
    if (!query || typeof query.id !== "string" || !query.id || queryIds.has(query.id) || !Array.isArray(query.state) || query.state.length !== 2 || !query.state.every(Number.isSafeInteger)) throw new TypeError("查询状态格式无效");
    queryIds.add(query.id);
  }
  const modelIds = new Set();
  for (const model of models) {
    if (!model || typeof model.id !== "string" || !model.id || modelIds.has(model.id) || !model.transitions || typeof model.transitions !== "object") throw new TypeError("候选黑箱系统格式无效");
    modelIds.add(model.id);
    for (const query of queries) {
      const next = model.transitions[query.id];
      if (!Array.isArray(next) || next.length !== 2 || !next.every(Number.isSafeInteger)) throw new TypeError(`候选 ${model.id} 缺少查询 ${query.id} 的转移`);
    }
  }
}

function outputKey(model, query) { return JSON.stringify(model.transitions[query.id]); }
function sortGroups(groups) { return [...groups.values()].sort((left, right) => JSON.stringify(left.next).localeCompare(JSON.stringify(right.next))); }
function partition(models, query) {
  const groups = new Map();
  for (const model of models) {
    const key = outputKey(model, query);
    if (!groups.has(key)) groups.set(key, { next: model.transitions[query.id], models: [] });
    groups.get(key).models.push(model);
  }
  return sortGroups(groups);
}

function chooseAdaptive(models, queries, used = new Set()) {
  if (models.length === 1) return { depth: 0, leaf: models[0].id };
  const choices = [];
  for (const query of queries) {
    if (used.has(query.id)) continue;
    const groups = partition(models, query);
    if (groups.length < 2) continue;
    const branchUsed = new Set(used); branchUsed.add(query.id);
    const branches = groups.map(group => ({ next: group.next, models: group.models.map(model => model.id), plan: chooseAdaptive(group.models, queries, branchUsed) }));
    if (branches.some(branch => branch.plan.depth === null)) continue;
    choices.push({ query: { id: query.id, state: query.state }, branches, depth: 1 + Math.max(...branches.map(branch => branch.plan.depth)) });
  }
  if (!choices.length) return { depth: null, reason: "remaining_models_are_indistinguishable" };
  choices.sort((left, right) => left.depth - right.depth || left.query.id.localeCompare(right.query.id));
  return choices[0];
}

function combinations(items, size, start = 0, chosen = [], output = []) {
  if (chosen.length === size) { output.push(chosen); return output; }
  for (let index = start; index <= items.length - (size - chosen.length); index += 1) combinations(items, size, index + 1, chosen.concat(items[index]), output);
  return output;
}

function distinguishesAll(models, queries) {
  return new Set(models.map(model => queries.map(query => outputKey(model, query)).join("|"))).size === models.length;
}

function chooseFixed(models, queries) {
  for (let size = 1; size <= queries.length; size += 1) {
    const witnesses = combinations(queries, size).filter(choice => distinguishesAll(models, choice));
    if (witnesses.length) return { depth: size, queries: witnesses[0].map(query => ({ id: query.id, state: query.state })), witnessCount: witnesses.length };
  }
  return { depth: null, queries: [], witnessCount: 0 };
}

function analyze(models, queries) {
  validate(models, queries);
  const adaptive = chooseAdaptive(models, queries);
  const fixed = chooseFixed(models, queries);
  const status = adaptive.depth === null || fixed.depth === null ? "unresolved_finite_family" : adaptive.depth < fixed.depth ? "adaptive_strict_advantage" : adaptive.depth === fixed.depth ? "no_adaptive_advantage" : "invalid_analysis";
  return { decoder: "finite_blackbox_query_design", status, candidateCount: models.length, queryCount: queries.length, adaptive, fixed, limits: ["候选黑箱系统和查询状态必须显式给出", `候选数不超过 ${MAX_MODELS}，查询数不超过 ${MAX_QUERIES}`, "只比较最坏情况查询深度", "系统只根据已观测输出选择后续查询", "结论不外推到未枚举的候选系统或查询状态"] };
}

function branchingFamily() {
  const queries = [{ id: "root", state: [0, 0] }, { id: "branch_a", state: [1, 0] }, { id: "branch_b", state: [0, 1] }];
  const models = [
    { id: "A1", transitions: { root: [0, 0], branch_a: [0, 0], branch_b: [0, 0] } },
    { id: "A2", transitions: { root: [0, 0], branch_a: [1, 0], branch_b: [0, 0] } },
    { id: "B1", transitions: { root: [1, 0], branch_a: [0, 0], branch_b: [0, 0] } },
    { id: "B2", transitions: { root: [1, 0], branch_a: [0, 0], branch_b: [1, 0] } },
  ];
  return { models, queries };
}

function nonBranchingFamily() {
  const queries = [{ id: "first", state: [0, 0] }, { id: "second", state: [1, 0] }];
  const models = [
    { id: "C1", transitions: { first: [0, 0], second: [0, 0] } },
    { id: "C2", transitions: { first: [0, 0], second: [1, 0] } },
    { id: "C3", transitions: { first: [1, 0], second: [0, 0] } },
    { id: "C4", transitions: { first: [1, 0], second: [1, 0] } },
  ];
  return { models, queries };
}

function makeCertificate(models, queries) { return { schemaVersion: 1, claim: "finite_blackbox_query_design", models, queries, result: analyze(models, queries) }; }
function verifyCertificate(certificate) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "finite_blackbox_query_design") return { status: "invalid_certificate" };
    const replay = analyze(certificate.models, certificate.queries);
    return JSON.stringify(replay) === JSON.stringify(certificate.result) ? { status: "verified_finite_blackbox_query_design", analysisStatus: replay.status, adaptiveDepth: replay.adaptive.depth, fixedDepth: replay.fixed.depth } : { status: "invalid_certificate", reason: "有限黑箱查询证书无法重放" };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

module.exports = { MAX_MODELS, MAX_QUERIES, validate, outputKey, partition, chooseAdaptive, combinations, distinguishesAll, chooseFixed, analyze, branchingFamily, nonBranchingFamily, makeCertificate, verifyCertificate };
