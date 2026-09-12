const assert = require("node:assert/strict");
const translation = require("./decoder_translation.js");
const result = translation.coverage({ readability: { machine: { basisSize: 6, candidateCount: 1 }, human: ["x^2+y^2"] } });
assert.equal(result.machineFields, 2);
assert.equal(result.humanFields, 1);
assert.equal(result.coverage, 0.5);
console.log("decoder_translation_test: passed");
