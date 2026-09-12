const fs = require("node:fs");
const path = require("node:path");
const protocol = require("./decoder_protocol.js");
const report = require("./decoder_report.js");
const schema = require("./benchmark_schema.js");
function run(benchmark) { schema.validateBenchmark(benchmark); return { schemaVersion: 1, claim: "decoder_benchmark_run", benchmarkVersion: benchmark.version, seed: benchmark.seed, results: benchmark.cases.map(testCase => { const start = process.hrtime.bigint(); const input = { domain: testCase.domain, development: testCase.partitions.train, holdout: testCase.partitions.test, tolerance: testCase.tolerance }; const result = protocol.decode(input); const stressResult = testCase.domain === "noisy_sequence" && testCase.partitions.stress?.length ? protocol.decode({ ...input, holdout: testCase.partitions.stress }) : null; return { id: testCase.id, expected: testCase.expected, actual: result.verification, verificationStrength: report.verificationStrength(result), elapsedMs: Number(process.hrtime.bigint() - start) / 1e6, stressSize: testCase.partitions.stress?.length || 0, stressVerification: stressResult?.verification || null, stressStrength: stressResult ? report.verificationStrength(stressResult) : null }; }) }; }
function main() { const benchmark = JSON.parse(fs.readFileSync(path.join(__dirname, "benchmark_v1_2.json"), "utf8")); const result = run(benchmark); fs.writeFileSync(path.join(__dirname, "benchmark_v1_2_results.json"), JSON.stringify(result, null, 2), "utf8"); console.log(`v1.2 benchmark：${result.results.length} cases`); return result; }
if (require.main === module) main();
module.exports = { run };
