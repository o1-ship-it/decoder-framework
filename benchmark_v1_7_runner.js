const fs = require("node:fs");
const path = require("node:path");
const protocol = require("./decoder_protocol.js");
const report = require("./decoder_report.js");
const schema = require("./benchmark_schema.js");

function run(benchmark) {
  schema.validateBenchmark(benchmark);
  return { schemaVersion: 1, claim: "decoder_benchmark_run", benchmarkVersion: benchmark.version, seed: benchmark.seed, results: benchmark.cases.map(item => {
    try {
      const start = process.hrtime.bigint();
      const result = protocol.decode({ domain: item.domain, development: item.partitions.train, holdout: item.partitions.test, stress: item.partitions.stress || [], options: item.options });
      return { id: item.id, expected: item.expected, actual: result.verification, verificationStrength: report.verificationStrength(result), candidateCount: result.candidateCount, elapsedMs: Number(process.hrtime.bigint() - start) / 1e6 };
    } catch (error) { return { id: item.id, expected: item.expected, actual: "error", verificationStrength: "unknown", error: error.message }; }
  }) };
}

function main() { const benchmark = JSON.parse(fs.readFileSync(path.join(__dirname, "benchmark_v1_7.json"), "utf8")); const result = run(benchmark); fs.writeFileSync(path.join(__dirname, "benchmark_v1_7_results.json"), JSON.stringify(result, null, 2), "utf8"); console.log(`v1.7 benchmark：${result.results.length} cases`); return result; }
if (require.main === module) main();
module.exports = { run };
