const fs = require("node:fs");
const path = require("node:path");
const experiment = require("./dynamics/blackbox_active_experiment.js");

function run(benchmark) {
  if (!benchmark || benchmark.schemaVersion !== 1 || !Array.isArray(benchmark.cases)) throw new TypeError("v3.1 benchmark 无效");
  const results = benchmark.cases.map(item => {
    const actual = experiment.compare();
    const expected = item.expected;
    const checks = {
      targetCount: actual.targetCount,
      activeMeanSteps: actual.active.meanSteps,
      activeMaxSteps: actual.active.maxSteps,
      passiveMeanSteps: actual.passiveUniform.meanSteps,
      passiveMaxSteps: actual.passiveUniform.maxSteps,
      fixedDiagonalMeanSteps: actual.fixedDiagonal.meanSteps,
    };
    return { id: item.id, expected, actual: checks, passed: Object.entries(expected).every(([key, value]) => checks[key] === value) };
  });
  return { schemaVersion: 1, claim: "decoder_benchmark_run", benchmarkVersion: benchmark.version, evaluation: "exhaustive_finite_census", passed: results.every(item => item.passed), results };
}

function main() {
  const benchmark = JSON.parse(fs.readFileSync(path.join(__dirname, "benchmark_v3_1.json"), "utf8"));
  const result = run(benchmark);
  fs.writeFileSync(path.join(__dirname, "benchmark_v3_1_results.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(`v3.1 benchmark：${result.results.length} cases，结果=${result.passed}`);
  return result;
}

if (require.main === module) main();
module.exports = { run };
