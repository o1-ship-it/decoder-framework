const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const runner = require("./benchmark_v3_6_runner.js");

const benchmark = JSON.parse(fs.readFileSync(path.join(__dirname, "benchmark_v3_6.json"), "utf8"));
const result = runner.run(benchmark);
assert.equal(result.passed, true);
assert.deepEqual(result.partitions, {
  calibration: { total: 2, passed: 2, frozen: 1, ambiguous: 1, counterexamples: 0, strictAdvantages: 1 },
  holdout: { total: 4, passed: 4, frozen: 0, ambiguous: 2, counterexamples: 2, strictAdvantages: 1 },
});
console.log("benchmark_v3_6_runner_test: passed");
