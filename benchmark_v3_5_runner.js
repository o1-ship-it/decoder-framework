const fs = require("node:fs");
const path = require("node:path");
const family = require("./dynamics/piecewise_map_family.js");

function summarize(results, partition) {
  const rows = results.filter(result => result.partition === partition);
  return { total: rows.length, passed: rows.filter(result => result.passed).length, strictAdvantages: rows.filter(result => result.actual.status === "adaptive_strict_advantage").length, noAdvantages: rows.filter(result => result.actual.status === "no_adaptive_advantage").length, meanAdaptiveDepth: rows.reduce((sum, result) => sum + result.actual.adaptiveDepth, 0) / rows.length, meanFixedDepth: rows.reduce((sum, result) => sum + result.actual.fixedDepth, 0) / rows.length };
}

function run(benchmark) {
  if (!benchmark || benchmark.schemaVersion !== 1 || benchmark.family !== "piecewise_origin_local_response" || !Array.isArray(benchmark.cases)) throw new TypeError("v3.5 benchmark 无效");
  const results = benchmark.cases.map(item => {
    if (item.partition !== "calibration" && item.partition !== "holdout") throw new TypeError("v3.5 benchmark 分区无效");
    const analyzed = family.analyze(item.options);
    const actual = { status: analyzed.status, candidateCount: analyzed.exact.candidateCount, queryCount: analyzed.exact.queryCount, adaptiveDepth: analyzed.exact.adaptive.depth, fixedDepth: analyzed.exact.fixed.depth, formulaMatches: analyzed.formulaMatches };
    return { id: item.id, partition: item.partition, expected: item.expected, actual, passed: Object.entries(item.expected).every(([key, value]) => actual[key] === value) };
  });
  const partitions = { calibration: summarize(results, "calibration"), holdout: summarize(results, "holdout") };
  if (!partitions.calibration.total || !partitions.holdout.total) throw new TypeError("v3.5 benchmark 必须包含 calibration 和 holdout");
  const exhaustive = family.exhaustiveCheck();
  return { schemaVersion: 1, claim: "decoder_benchmark_run", benchmarkVersion: benchmark.version, evaluation: "frozen_piecewise_map_family_holdout", partitionPolicy: benchmark.partitionPolicy, passed: results.every(result => result.passed) && exhaustive.formulaMatches === exhaustive.total, results, partitions, exhaustive };
}

function main() {
  const benchmark = JSON.parse(fs.readFileSync(path.join(__dirname, "benchmark_v3_5.json"), "utf8"));
  const result = run(benchmark);
  fs.writeFileSync(path.join(__dirname, "benchmark_v3_5_results.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(`v3.5 benchmark：${result.results.length} cases，结果=${result.passed}`);
  return result;
}

if (require.main === module) main();
module.exports = { summarize, run };
