const assert = require("node:assert/strict");
const fs = require("node:fs");
const runner = require("./benchmark_v1_2_runner.js");
const result = runner.run(JSON.parse(fs.readFileSync("./benchmark_v1_2.json", "utf8")));
assert.equal(result.results.length, 2);
assert.equal(result.results.filter(item => item.verificationStrength === "verified").length, 1);
assert.equal(result.results.filter(item => item.verificationStrength === "unknown").length, 1);
assert.ok(result.results.find(item => item.id === "noisy_arithmetic_v12").stressVerification);
console.log("benchmark_v1_2_runner_test: passed");
