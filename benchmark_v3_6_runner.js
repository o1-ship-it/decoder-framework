const fs = require("node:fs");
const path = require("node:path");
const inference = require("./dynamics/piecewise_map_inference.js");

function summarize(results, partition) {
  const rows = results.filter(result => result.partition === partition);
  return {
    total: rows.length,
    passed: rows.filter(result => result.passed).length,
    frozen: rows.filter(result => result.actual.status === "candidate_frozen").length,
    ambiguous: rows.filter(result => result.actual.status.startsWith("ambiguous")).length,
    counterexamples: rows.filter(result => result.actual.status === "counterexample_found").length,
    strictAdvantages: rows.filter(result => result.actual.activeStatus === "adaptive_strict_advantage").length,
  };
}

function compact(result) {
  return {
    status: result.status,
    failureStage: result.failure?.stage || null,
    initialCandidateCount: result.initialCandidateCount,
    trainingCandidateCount: result.stages.training.candidateCount,
    holdoutCandidateCount: result.stages.holdout.candidateCount,
    recoveredRegion: result.stages.holdout.region,
    recoveredResponse: result.stages.holdout.response,
    activeStatus: result.activeDesign?.status || null,
    adaptiveDepth: result.activeDesign?.adaptive.depth ?? null,
    fixedDepth: result.activeDesign?.fixed.depth ?? null,
  };
}

function run(benchmark) {
  if (!benchmark || benchmark.schemaVersion !== 1 || benchmark.family !== "piecewise_origin_local_response" || !Array.isArray(benchmark.cases)) throw new TypeError("v3.6 benchmark 无效");
  const results = benchmark.cases.map(item => {
    if (item.partition !== "calibration" && item.partition !== "holdout") throw new TypeError("v3.6 benchmark 分区无效");
    const actual = compact(inference.analyze(item.input));
    return { id: item.id, partition: item.partition, expected: item.expected, actual, passed: Object.entries(item.expected).every(([key, value]) => actual[key] === value) };
  });
  const partitions = { calibration: summarize(results, "calibration"), holdout: summarize(results, "holdout") };
  if (!partitions.calibration.total || !partitions.holdout.total) throw new TypeError("v3.6 benchmark 必须包含 calibration 和 holdout");
  return { schemaVersion: 1, claim: "decoder_benchmark_run", benchmarkVersion: benchmark.version, evaluation: "frozen_piecewise_map_inference_pipeline", partitionPolicy: benchmark.partitionPolicy, passed: results.every(result => result.passed), results, partitions };
}

function main() {
  const benchmark = JSON.parse(fs.readFileSync(path.join(__dirname, "benchmark_v3_6.json"), "utf8"));
  const result = run(benchmark);
  fs.writeFileSync(path.join(__dirname, "benchmark_v3_6_results.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(`v3.6 benchmark：${result.results.length} cases，结果=${result.passed}`);
  return result;
}

if (require.main === module) main();
module.exports = { summarize, compact, run };
