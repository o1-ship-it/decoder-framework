const assert = require("node:assert/strict");
const dynamics = require("./dynamics_invariant.js");
const inference = require("./dynamics_condition_inference.js");

function rotationScaling({ a, b }) { return { x: [{ coefficient: a, powers: [1, 0] }, { coefficient: -b, powers: [0, 1] }], y: [{ coefficient: b, powers: [1, 0] }, { coefficient: a, powers: [0, 1] }] }; }
const invariant = dynamics.discoverLinear(rotationScaling({ a: 0, b: 1 }), 2).invariants.find(item => item.rule === "1x^0y^2 + 1x^2y^0");
const samples = [{ a: 0, b: 1 }, { a: 1, b: 0 }, { a: 0, b: -1 }, { a: -1, b: 0 }, { a: 1, b: 1 }, { a: 2, b: 0 }, { a: 2, b: 1 }];
const result = inference.inferCondition(rotationScaling, invariant, samples);
assert.equal(result.condition, "-1 + a^2 + b^2=0");
assert.ok(result.checks.every(check => check.residual === 0));
assert.equal(result.fitChecks.length, 6);
assert.equal(result.holdoutChecks.length, 1);
assert.equal(result.generalizes, true);
const multiState = inference.inferCondition(rotationScaling, invariant, samples, [[1, 0], [0, 1], [1, 1]]);
assert.equal(multiState.generalizes, true);
assert.equal(result.status, "verified_parameter_condition");
const conditionCertificate = inference.makeCertificate(rotationScaling, invariant, samples);
assert.equal(inference.verifyCertificate(conditionCertificate, rotationScaling, invariant, samples).status, "verified_parameter_condition");
function adversarialFamily({ a, b }) {
  const perturbation = [-2, -1, 0, 1, 2, 3].reduce((value, root) => value * (a - root), 1);
  return { x: [{ coefficient: 1 + perturbation, powers: [1, 0] }], y: [{ coefficient: 1, powers: [0, 1] }] };
}
const adversarialSamples = [{ a: -2, b: 0 }, { a: -1, b: 1 }, { a: 0, b: 4 }, { a: 1, b: 2 }, { a: 2, b: 7 }, { a: 3, b: -3 }, { a: 4, b: 0 }];
const adversarial = inference.inferCondition(adversarialFamily, invariant, adversarialSamples);
assert.equal(adversarial.generalizes, false);
assert.equal(adversarial.status, "overfit_candidate");
assert.ok(adversarial.holdoutChecks.some(check => check.residual !== 0));
assert.throws(() => inference.inferCondition(rotationScaling, invariant, samples.slice(0, 6)), /留出/);
console.log("dynamics_condition_inference_test: passed");
