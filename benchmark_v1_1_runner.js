const fs = require("node:fs");
const path = require("node:path");
const protocol = require("./decoder_protocol.js");
const report = require("./decoder_report.js");
const schema = require("./benchmark_schema.js");
function rotationMap() { return { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] }; }
function inputFor(testCase) {
  if (testCase.id.startsWith("sequence_arithmetic")) return { domain: "sequence", development: testCase.partitions.train, holdout: testCase.partitions.test };
  if (testCase.id.startsWith("sequence_random")) return { domain: "sequence", development: testCase.partitions.train, holdout: testCase.partitions.test };
  if (testCase.id === "dynamics_rotation_v11") return { domain: "dynamics", map: rotationMap(), maxDegree: 2, method: "linear_nullspace" };
  if (testCase.id === "dynamics_boundary_v11") return { domain: "dynamics_parameterized", parameters: testCase.partitions.test[0] };
  throw new Error("未知 benchmark case");
}
function run(benchmark) {
  schema.validateBenchmark(benchmark);
  return { schemaVersion: 1, claim: "decoder_benchmark_run", benchmarkVersion: benchmark.version, seed: benchmark.seed, resourceBudgetMs: benchmark.resourceBudgetMs, results: benchmark.cases.map(testCase => { const started = process.hrtime.bigint(); try { const input = inputFor(testCase); const result = protocol.decode(input); const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6; let stressVerification = null; if (testCase.partitions.stress?.length && input.domain === "sequence") stressVerification = protocol.decode({ ...input, holdout: testCase.partitions.stress }).verification; return { id: testCase.id, expected: testCase.expected, actual: result.verification, verificationStrength: report.verificationStrength(result), elapsedMs, withinBudget: elapsedMs <= benchmark.resourceBudgetMs, stressSize: testCase.partitions.stress?.length || 0, stressVerification }; } catch (error) { return { id: testCase.id, actual: "error", verificationStrength: "unknown", error: error.message }; } }) };
}
function main() { const benchmark = JSON.parse(fs.readFileSync(path.join(__dirname, "benchmark_v1_1.json"), "utf8")); const result = run(benchmark); fs.writeFileSync(path.join(__dirname, "benchmark_v1_1_results.json"), JSON.stringify(result, null, 2), "utf8"); console.log(`v1.1 benchmark：${result.results.length} cases`); return result; }
if (require.main === module) main();
module.exports = { run, inputFor };
