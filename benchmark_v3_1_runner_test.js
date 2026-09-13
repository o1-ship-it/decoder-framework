const assert = require("node:assert/strict");
const fs = require("node:fs");
const runner = require("./benchmark_v3_1_runner.js");
const result = runner.run(JSON.parse(fs.readFileSync("./benchmark_v3_1.json", "utf8")));
assert.equal(result.passed, true);
assert.equal(result.results.length, 1);
console.log("benchmark_v3_1_runner_test: passed");
