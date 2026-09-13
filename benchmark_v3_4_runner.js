const fs = require("node:fs");
const path = require("node:path");
const family = require("./dynamics/parametric_branching_family.js");

function summarize(results, partition) {
  const rows = results.filter(result => result.partition === partition);
  return {
    total: rows.length,
    passed: rows.filter(result => result.passed).length,
    strictAdvantages: rows.filter(result => result.actual.status === "adaptive_strict_advantage").length,
    noAdvantages: rows.filter(result => result.actual.status === "no_adaptive_advantage").length,
    meanAdaptiveDepth: rows.reduce((sum, result) => sum + result.actual.adaptiveDepth, 0) / rows.length,
    meanFixedDepth: rows.reduce((sum, result) => sum + result.actual.fixedDepth, 0) / rows.length,
  };
}

function run(benchmark) {
  if (!benchmark || benchmark.schemaVersion !== 1 || benchmark.family !== "regime_selected_local_response" || !Array.isArray(benchmark.cases)) throw new TypeError("v3.4 benchmark 无效");
  const results = benchmark.cases.map(item => {
    if (item.partition !== "calibration" && item.partition !== "holdout") throw new TypeError("v3.4 benchmark 分区无效");
    const actualResult = family.analyze(item.options);
    const actual = { status: actualResult.status, candidateCount: actualResult.exact.candidateCount, queryCount: actualResult.exact.queryCount, adaptiveDepth: actualResult.exact.adaptive.depth, fixedDepth: actualResult.exact.fixed.depth, formulaMatches: actualResult.formulaMatches };
    return { id: item.id, partition: item.partition, expected: item.expected, actual, passed: Object.entries(item.expected).every(([key, value]) => actual[key] === value) };
  });
  const partitions = { calibration: summarize(results, "calibration"), holdout: summarize(results, "holdout") };
  if (!partitions.calibration.total || !partitions.holdout.total) throw new TypeError("v3.4 benchmark 必须包含 calibration 和 holdout");
  const exhaustive = family.exhaustiveCheck();
  const exhaustivePassed = exhaustive.formulaMatches === exhaustive.total;
  return { schemaVersion: 1, claim: "decoder_benchmark_run", benchmarkVersion: benchmark.version, evaluation: "frozen_parametric_family_holdout", partitionPolicy: benchmark.partitionPolicy, passed: results.every(result => result.passed) && exhaustivePassed, results, partitions, exhaustive };
}

function main() {
  const benchmark = JSON.parse(fs.readFileSync(path.join(__dirname, "benchmark_v3_4.json"), "utf8"));
  const result = run(benchmark);
  fs.writeFileSync(path.join(__dirname, "benchmark_v3_4_results.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(`v3.4 benchmark：${result.results.length} cases，结果=${result.passed}`);
  return result;
}

if (require.main === module) main();
module.exports = { summarize, run };
