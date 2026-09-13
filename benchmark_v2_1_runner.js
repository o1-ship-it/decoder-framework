const fs = require("node:fs");
const path = require("node:path");
const protocol = require("./decoder_protocol.js");
function run(benchmark) { if (!benchmark || benchmark.schemaVersion !== 1 || !Array.isArray(benchmark.cases)) throw new TypeError("v2.1 benchmark 无效"); return { schemaVersion: 1, claim: "decoder_benchmark_run", benchmarkVersion: benchmark.version, seed: benchmark.seed, results: benchmark.cases.map(item => { const result = protocol.decode({ domain: item.domain, development: item.partitions.train, holdout: item.partitions.test, options: item.options }); return { id: item.id, expected: item.expected, actual: result.verification, recommendedAdditionalObservations: result.recommendedAdditionalObservations }; }) }; }
function main() { const benchmark = JSON.parse(fs.readFileSync(path.join(__dirname, "benchmark_v2_1.json"), "utf8")); const result = run(benchmark); fs.writeFileSync(path.join(__dirname, "benchmark_v2_1_results.json"), JSON.stringify(result, null, 2), "utf8"); console.log(`v2.1 benchmark：${result.results.length} cases`); return result; }
if (require.main === module) main();
module.exports = { run };
