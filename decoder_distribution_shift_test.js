const assert = require("node:assert/strict");
const protocol = require("./decoder_protocol.js");
const shift = require("./decoder_distribution_shift.js");
const run = (train, holdout) => protocol.decode({ domain: "noisy_sequence", development: train, holdout, tolerance: 2 });
const result = shift.evaluate(run, [3, 8, 11, 16, 19, 24], [27, 32], [40, 60]);
assert.equal(result.classification, "stress_failure");
assert.equal(result.distributionShift, true);
console.log("decoder_distribution_shift_test: passed");
