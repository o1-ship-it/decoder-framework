const assert = require("node:assert/strict");
const ablation = require("./decoder_ablation.js");
const map = { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] };
const result = ablation.compareDynamics(map, 2, 1);
assert.equal(result.methods.length, 2);
assert.ok(result.methods.every(method => method.status === "completed"));
assert.ok(result.methods.every(method => method.candidateCount === null || method.candidateCount >= 0));
console.log("decoder_ablation_test: passed");
