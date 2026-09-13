const assert = require("node:assert/strict");
const fs = require("node:fs");
const runner = require("./benchmark_v2_0_runner.js");
const result = runner.run(JSON.parse(fs.readFileSync("./benchmark_v2_0.json", "utf8")));
assert.equal(result.calibration.rows.length, 2);
assert.equal(result.test.rows.length, 2);
assert.equal(result.test.summary.exactLabelRate, 1);
console.log("benchmark_v2_0_runner_test: passed");
