// Parametric regime-local-response black-box family with an exact query-design check.

const queryDesign = require("./branching_query_design.js");

const MAX_BRANCHES = 8;
const MAX_VARIANTS = 8;

function normalizeOptions(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("参数化分支族选项必须是对象");
  const branchCount = options.branchCount ?? 2;
  const variantCount = options.variantCount ?? 2;
  if (!Number.isSafeInteger(branchCount) || branchCount < 1 || branchCount > MAX_BRANCHES) throw new RangeError(`运行区间数必须在 1..${MAX_BRANCHES}`);
  if (!Number.isSafeInteger(variantCount) || variantCount < 1 || variantCount > MAX_VARIANTS) throw new RangeError(`局部响应数必须在 1..${MAX_VARIANTS}`);
  if (branchCount * variantCount < 2) throw new RangeError("候选黑箱系统至少需要两个");
  if (branchCount * variantCount > queryDesign.MAX_MODELS) throw new RangeError(`候选黑箱系统不能超过 ${queryDesign.MAX_MODELS} 个`);
  if (branchCount + 1 > queryDesign.MAX_QUERIES) throw new RangeError(`可查询状态不能超过 ${queryDesign.MAX_QUERIES} 个`);
  return { branchCount, variantCount };
}

function makeFamily(rawOptions = {}) {
  const options = normalizeOptions(rawOptions);
  const queries = [{ id: "root", state: [0, 0] }];
  for (let branch = 1; branch <= options.branchCount; branch += 1) queries.push({ id: `branch_${branch}`, state: [branch, 0] });
  const models = [];
  for (let branch = 1; branch <= options.branchCount; branch += 1) {
    for (let response = 0; response < options.variantCount; response += 1) {
      const transitions = { root: [branch, 0] };
      for (let probe = 1; probe <= options.branchCount; probe += 1) transitions[`branch_${probe}`] = probe === branch ? [response, 0] : [0, 0];
      models.push({ id: `regime_${branch}_response_${response}`, transitions });
    }
  }
  return { family: "regime_selected_local_response", options, queries, models };
}

function expectedTheorem(rawOptions = {}) {
  const options = normalizeOptions(rawOptions);
  const feedbackMatters = options.branchCount >= 2 && options.variantCount >= 2;
  return {
    status: feedbackMatters ? "adaptive_strict_advantage" : "no_adaptive_advantage",
    candidateCount: options.branchCount * options.variantCount,
    queryCount: options.branchCount + 1,
    adaptiveDepth: feedbackMatters ? 2 : 1,
    fixedDepth: feedbackMatters ? options.branchCount + 1 : 1,
    feedbackMatters,
    argument: feedbackMatters
      ? "根查询确定运行区间；该区间对应的局部查询确定响应。固定设计必须包含根查询和每个区间的局部查询。"
      : "只有一个运行区间或一个局部响应时，单个可区分查询已经足够，反馈不减少最坏查询深度。",
  };
}

function validConfigurations() {
  const configurations = [];
  for (let branchCount = 1; branchCount <= MAX_BRANCHES; branchCount += 1) {
    const maxVariants = Math.min(MAX_VARIANTS, Math.floor(queryDesign.MAX_MODELS / branchCount));
    for (let variantCount = 1; variantCount <= maxVariants; variantCount += 1) {
      if (branchCount * variantCount >= 2) configurations.push({ branchCount, variantCount });
    }
  }
  return configurations;
}

function analyze(rawOptions = {}) {
  const family = makeFamily(rawOptions);
  const theorem = expectedTheorem(family.options);
  const exact = queryDesign.analyze(family.models, family.queries);
  const formulaMatches = exact.status === theorem.status
    && exact.candidateCount === theorem.candidateCount
    && exact.queryCount === theorem.queryCount
    && exact.adaptive.depth === theorem.adaptiveDepth
    && exact.fixed.depth === theorem.fixedDepth;
  return {
    schemaVersion: 1,
    decoder: "parametric_branching_query_design",
    family: family.family,
    options: family.options,
    status: formulaMatches ? exact.status : "invalid_analysis",
    theorem,
    exact,
    formulaMatches,
    limits: [
      "黑箱由有限运行区间和有限局部响应生成",
      `运行区间数不超过 ${MAX_BRANCHES}，局部响应数不超过 ${MAX_VARIANTS}`,
      `候选数不超过 ${queryDesign.MAX_MODELS}，查询数不超过 ${queryDesign.MAX_QUERIES}`,
      "只比较无噪声最坏情况查询深度",
      "校准与留出配置只检验已声明的生成族，不表示对未声明系统的泛化",
    ],
  };
}

function exhaustiveCheck() {
  const results = validConfigurations().map(options => {
    const result = analyze(options);
    return { status: result.status, formulaMatches: result.formulaMatches };
  });
  return {
    total: results.length,
    formulaMatches: results.filter(result => result.formulaMatches).length,
    strictAdvantages: results.filter(result => result.status === "adaptive_strict_advantage").length,
    noAdvantages: results.filter(result => result.status === "no_adaptive_advantage").length,
  };
}

function makeCertificate(options = {}) {
  const normalized = normalizeOptions(options);
  return { schemaVersion: 1, claim: "parametric_branching_query_family", options: normalized, result: analyze(normalized) };
}

function verifyCertificate(certificate) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "parametric_branching_query_family") return { status: "invalid_certificate" };
    const replay = analyze(certificate.options);
    if (JSON.stringify(replay) !== JSON.stringify(certificate.result)) return { status: "invalid_certificate", reason: "参数化分支查询证书无法重放" };
    return { status: "verified_parametric_branching_query_family", analysisStatus: replay.status, formulaMatches: replay.formulaMatches, adaptiveDepth: replay.exact.adaptive.depth, fixedDepth: replay.exact.fixed.depth };
  } catch (error) {
    return { status: "invalid_certificate", reason: error.message };
  }
}

module.exports = { MAX_BRANCHES, MAX_VARIANTS, normalizeOptions, makeFamily, expectedTheorem, validConfigurations, analyze, exhaustiveCheck, makeCertificate, verifyCertificate };
