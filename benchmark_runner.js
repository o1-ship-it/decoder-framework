const fs = require("node:fs");
const path = require("node:path");
const protocol = require("./decoder_protocol.js");
const report = require("./decoder_report.js");
const schema = require("./benchmark_schema.js");

function rotationMap() { return { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] }; }

function toInput(testCase) {
  if (testCase.id.startsWith("sequence_")) return { domain: "sequence", development: testCase.partitions.train, holdout: testCase.partitions.test };
  if (testCase.id === "dynamics_rotation") return { domain: "dynamics", map: rotationMap(), maxDegree: 2, method: "linear_nullspace" };
  if (testCase.id === "dynamics_parameter_boundary") return { domain: "dynamics_parameterized", parameters: testCase.partitions.test[0] };
  throw new Error(`没有 ${testCase.id} 的输入适配器`);
}

function run(benchmark) {
  schema.validateBenchmark(benchmark);
  const results = benchmark.cases.map(testCase => { try { const result = protocol.decode(toInput(testCase)); return { id: testCase.id, expected: testCase.expected, actual: result.verification, verificationStrength: report.verificationStrength(result), result }; } catch (error) { return { id: testCase.id, expected: testCase.expected, actual: "error", verificationStrength: "unknown", error: error.message }; } });
  return { schemaVersion: 1, claim: "decoder_benchmark_run", benchmarkClaim: benchmark.claim, results, summary: schema.summarize(results) };
}

function main() { const benchmark = JSON.parse(fs.readFileSync(path.join(__dirname, "benchmark_v1.json"), "utf8")); const output = run(benchmark); fs.writeFileSync(path.join(__dirname, "benchmark_v1_results.json"), JSON.stringify(output, null, 2), "utf8"); console.log(`benchmark：${output.summary.verified} verified，${output.summary.unknown} unknown，${output.summary.refuted} refuted`); return output; }
if (require.main === module) main();
module.exports = { run, toInput };
