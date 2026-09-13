const fs = require("node:fs");
const path = require("node:path");
const lowerBound = require("./dynamics/linear_query_lower_bound.js");

function run(benchmark) {
  if (!benchmark || benchmark.schemaVersion !== 1 || !Array.isArray(benchmark.cases)) throw new TypeError("v3.2 benchmark 无效");
  const results = benchmark.cases.map(item => { const actual = lowerBound.prove(item.options); const checks = { candidateCount: actual.candidateCount, maxOneQueryOutputs: actual.maxOneQueryOutputs, lowerBoundQueries: actual.lowerBoundQueries, upperBoundQueries: actual.upperBoundQueries, optimalQueryCount: actual.optimalQueryCount, adaptiveLowerBound: actual.adaptiveLowerBound }; return { id: item.id, expected: item.expected, actual: checks, passed: Object.entries(item.expected).every(([key, value]) => checks[key] === value) }; });
  return { schemaVersion: 1, claim: "decoder_benchmark_run", benchmarkVersion: benchmark.version, evaluation: "finite_lower_bound_certificate", passed: results.every(item => item.passed), results };
}

function main() { const benchmark = JSON.parse(fs.readFileSync(path.join(__dirname, "benchmark_v3_2.json"), "utf8")); const result = run(benchmark); fs.writeFileSync(path.join(__dirname, "benchmark_v3_2_results.json"), JSON.stringify(result, null, 2), "utf8"); console.log(`v3.2 benchmark：${result.results.length} cases，结果=${result.passed}`); return result; }
if (require.main === module) main();
module.exports = { run };
