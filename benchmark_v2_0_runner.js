const fs = require("node:fs");
const path = require("node:path");
const matrix = require("./decoder_capability_matrix.js");

function run(benchmark) {
  if (!benchmark || benchmark.schemaVersion !== 1 || !Array.isArray(benchmark.cases)) throw new TypeError("v2.0 benchmark 无效");
  const tasks = benchmark.cases.map(item => ({ id: item.id, partition: item.partition, train: item.partitions.train, test: item.partitions.test, stress: item.partitions.stress || [], options: item.options || {}, expected: item.expected }));
  return { benchmarkVersion: benchmark.version, seed: benchmark.seed, ...matrix.runMatrix(tasks) };
}
function main() { const benchmark = JSON.parse(fs.readFileSync(path.join(__dirname, "benchmark_v2_0.json"), "utf8")); const result = run(benchmark); fs.writeFileSync(path.join(__dirname, "benchmark_v2_0_results.json"), JSON.stringify(result, null, 2), "utf8"); console.log(`v2.0 benchmark：${result.test.rows.length + result.calibration.rows.length} cases`); return result; }
if (require.main === module) main();
module.exports = { run };
