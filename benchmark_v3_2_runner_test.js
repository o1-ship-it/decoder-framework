const assert = require("node:assert/strict");
const fs = require("node:fs");
const runner = require("./benchmark_v3_2_runner.js");
const result = runner.run(JSON.parse(fs.readFileSync("./benchmark_v3_2.json", "utf8")));
assert.equal(result.passed, true);
console.log("benchmark_v3_2_runner_test: passed");
