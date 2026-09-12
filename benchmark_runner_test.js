const assert = require("node:assert/strict");
const fs = require("node:fs");
const runner = require("./benchmark_runner.js");
const benchmark = JSON.parse(fs.readFileSync("./benchmark_v1.json", "utf8"));
const result = runner.run(benchmark);
assert.equal(result.summary.total, 4);
assert.equal(result.summary.verified, 2);
assert.equal(result.summary.unknown, 2);
console.log("benchmark_runner_test: passed");
