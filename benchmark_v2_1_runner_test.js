const assert = require("node:assert/strict");
const fs = require("node:fs");
const runner = require("./benchmark_v2_1_runner.js");
const result = runner.run(JSON.parse(fs.readFileSync("./benchmark_v2_1.json", "utf8")));
assert.deepEqual(result.results.map(row => row.actual), ["ambiguous_within_horizon", "identified_hidden_structure"]);
assert.ok(result.results[0].recommendedAdditionalObservations > 0);
console.log("benchmark_v2_1_runner_test: passed");
