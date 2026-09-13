// Piecewise integer-map family: regime is encoded by the origin response,
// while a regime-local probe exposes a second parameter.

const queryDesign = require("./branching_query_design.js");

const MAX_REGIONS = 8;
const MAX_RESPONSES = 8;

function normalizeOptions(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("分段映射族选项必须是对象");
  const regionCount = options.regionCount ?? 2;
  const responseCount = options.responseCount ?? 2;
  if (!Number.isSafeInteger(regionCount) || regionCount < 1 || regionCount > MAX_REGIONS) throw new RangeError(`分段区域数必须在 1..${MAX_REGIONS}`);
  if (!Number.isSafeInteger(responseCount) || responseCount < 1 || responseCount > MAX_RESPONSES) throw new RangeError(`局部响应数必须在 1..${MAX_RESPONSES}`);
  if (regionCount * responseCount < 2 || regionCount * responseCount > queryDesign.MAX_MODELS) throw new RangeError(`候选分段映射数必须在 2..${queryDesign.MAX_MODELS}`);
  if (regionCount + 1 > queryDesign.MAX_QUERIES) throw new RangeError(`查询状态不能超过 ${queryDesign.MAX_QUERIES} 个`);
  return { regionCount, responseCount };
}

function regionOf(state, regionCount) {
  if (!Array.isArray(state) || state.length !== 2 || !state.every(Number.isSafeInteger)) throw new TypeError("映射状态必须是二维安全整数");
  const [x, y] = state;
  if (x === 0 && y === 0) return "origin";
  if (y === 1 && x >= 1 && x <= regionCount) return `local_${x}`;
  return "background";
}

function evaluateMap(map, state) {
  const region = regionOf(state, map.regionCount);
  if (region === "origin") return [map.region, 0];
  if (region === `local_${map.region}`) return [map.response, 0];
  return [0, 0];
}

function makeQueries(options) {
  const normalized = normalizeOptions(options);
  const queries = [{ id: "origin", state: [0, 0] }];
  for (let region = 1; region <= normalized.regionCount; region += 1) queries.push({ id: `local_${region}`, state: [region, 1] });
  return queries;
}

function makeFamily(rawOptions = {}) {
  const options = normalizeOptions(rawOptions);
  const queries = makeQueries(options);
  const models = [];
  for (let region = 1; region <= options.regionCount; region += 1) {
    for (let response = 0; response < options.responseCount; response += 1) models.push({ id: `map_region_${region}_response_${response}`, regionCount: options.regionCount, region, response });
  }
  return { family: "piecewise_origin_local_response", options, queries, models };
}

function materializeTransitions(model, queries) {
  const transitions = {};
  for (const query of queries) transitions[query.id] = evaluateMap(model, query.state);
  return transitions;
}

function mapCandidates(rawOptions = {}) {
  const family = makeFamily(rawOptions);
  return family.models.map(model => ({ id: model.id, map: { regionCount: model.regionCount, region: model.region, response: model.response }, transitions: materializeTransitions(model, family.queries) }));
}

function analyze(rawOptions = {}) {
  const family = makeFamily(rawOptions);
  const candidates = family.models.map(model => ({ ...model, transitions: materializeTransitions(model, family.queries) }));
  const exact = queryDesign.analyze(candidates, family.queries);
  const { regionCount, responseCount } = family.options;
  const feedbackMatters = regionCount >= 2 && responseCount >= 2;
  const theorem = {
    status: feedbackMatters ? "adaptive_strict_advantage" : "no_adaptive_advantage",
    candidateCount: regionCount * responseCount,
    queryCount: regionCount + 1,
    adaptiveDepth: feedbackMatters ? 2 : 1,
    fixedDepth: feedbackMatters ? regionCount + 1 : 1,
    feedbackMatters,
  };
  const formulaMatches = exact.status === theorem.status && exact.candidateCount === theorem.candidateCount && exact.queryCount === theorem.queryCount && exact.adaptive.depth === theorem.adaptiveDepth && exact.fixed.depth === theorem.fixedDepth;
  return {
    schemaVersion: 1,
    decoder: "piecewise_map_query_design",
    family: family.family,
    options: family.options,
    mapRule: "F_{r,s}(x,y)=[r,0] at (0,0); [s,0] at (r,1); [0,0] elsewhere",
    status: formulaMatches ? exact.status : "invalid_analysis",
    theorem,
    exact,
    formulaMatches,
    limits: [
      "候选由二维分段整数映射规则生成，不直接以转移表作为输入",
      `区域数不超过 ${MAX_REGIONS}，局部响应数不超过 ${MAX_RESPONSES}`,
      `候选数不超过 ${queryDesign.MAX_MODELS}，查询数不超过 ${queryDesign.MAX_QUERIES}`,
      "只比较无噪声最坏情况查询深度",
      "结论不外推到未声明的分段边界、连续状态、噪声或通用动力系统",
    ],
  };
}

function exhaustiveCheck() {
  const results = [];
  for (let regionCount = 1; regionCount <= MAX_REGIONS; regionCount += 1) {
    for (let responseCount = 1; responseCount <= Math.min(MAX_RESPONSES, Math.floor(queryDesign.MAX_MODELS / regionCount)); responseCount += 1) {
      if (regionCount * responseCount < 2) continue;
      const result = analyze({ regionCount, responseCount });
      results.push({ regionCount, responseCount, status: result.status, formulaMatches: result.formulaMatches });
    }
  }
  return { total: results.length, formulaMatches: results.filter(result => result.formulaMatches).length, strictAdvantages: results.filter(result => result.status === "adaptive_strict_advantage").length, noAdvantages: results.filter(result => result.status === "no_adaptive_advantage").length };
}

function makeCertificate(options = {}) {
  const normalized = normalizeOptions(options);
  return { schemaVersion: 1, claim: "piecewise_map_query_family", options: normalized, result: analyze(normalized) };
}

function verifyCertificate(certificate) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "piecewise_map_query_family") return { status: "invalid_certificate" };
    const replay = analyze(certificate.options);
    if (JSON.stringify(replay) !== JSON.stringify(certificate.result)) return { status: "invalid_certificate", reason: "分段映射查询证书无法重放" };
    return { status: "verified_piecewise_map_query_family", analysisStatus: replay.status, formulaMatches: replay.formulaMatches, adaptiveDepth: replay.exact.adaptive.depth, fixedDepth: replay.exact.fixed.depth };
  } catch (error) {
    return { status: "invalid_certificate", reason: error.message };
  }
}

module.exports = { MAX_REGIONS, MAX_RESPONSES, normalizeOptions, regionOf, evaluateMap, makeQueries, makeFamily, materializeTransitions, mapCandidates, analyze, exhaustiveCheck, makeCertificate, verifyCertificate };
