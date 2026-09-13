const assert = require("node:assert/strict");
const fs = require("node:fs");
const runner = require("./benchmark_v1_7_runner.js");
const result = runner.run(JSON.parse(fs.readFileSync("./benchmark_v1_7.json", "utf8")));
assert.deepEqual(result.results.map(row => row.verificationStrength), ["verified", "unknown", "unknown"]);
assert.equal(result.results[0].actual, "verified_unique_hidden_structure");
assert.equal(result.results[1].actual, "ambiguous_hidden_structure");
console.log("benchmark_v1_7_runner_test: passed");
