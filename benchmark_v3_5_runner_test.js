const assert = require("node:assert/strict");
const fs = require("node:fs");
const runner = require("./benchmark_v3_5_runner.js");

const result = runner.run(JSON.parse(fs.readFileSync("./benchmark_v3_5.json", "utf8")));
assert.equal(result.passed, true);
assert.deepEqual(result.exhaustive, { total: 33, formulaMatches: 33, strictAdvantages: 19, noAdvantages: 14 });
assert.equal(result.partitions.calibration.total, 2);
assert.equal(result.partitions.holdout.total, 3);
assert.equal(result.partitions.holdout.strictAdvantages, 2);
assert.equal(result.partitions.holdout.noAdvantages, 1);
console.log("benchmark_v3_5_runner_test: passed");
