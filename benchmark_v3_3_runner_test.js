const assert = require("node:assert/strict");
const fs = require("node:fs");
const runner = require("./benchmark_v3_3_runner.js");
const result = runner.run(JSON.parse(fs.readFileSync("./benchmark_v3_3.json", "utf8")));
assert.equal(result.passed, true);
assert.equal(result.results.length, 2);
assert.deepEqual(result.results.map(item => item.actual.status), ["adaptive_strict_advantage", "no_adaptive_advantage"]);
console.log("benchmark_v3_3_runner_test: passed");
