const assert = require("node:assert/strict");
const noisy = require("./decoder_noisy_active_design.js");
const result = noisy.design([1, 3, 5, 7, 9, 11, 13], [15, 17], { maxModulus: 24, tolerance: 1, horizon: 8 });
assert.equal(result.status, "noise_robust_disambiguation_plan");
assert.equal(result.recommendation.additionalObservations, 3);
assert.ok(result.recommendation.guaranteedEliminations > 0);
const certificate = noisy.makeCertificate([1, 3, 5, 7, 9, 11, 13], [15, 17], { maxModulus: 24, tolerance: 1, horizon: 8 });
assert.equal(noisy.verifyCertificate(certificate).status, "noise_robust_disambiguation_plan");
console.log("decoder_noisy_active_design_test: passed");
