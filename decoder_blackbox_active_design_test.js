const assert = require("node:assert/strict");
const active = require("./dynamics/blackbox_active_design.js");
const experiment = require("./dynamics/blackbox_active_experiment.js");

const initial = [{ state: [0, 0], next: [0, 0] }];
const options = { stateMin: -1, stateMax: 1, coefficientRange: 1 };
const plan = active.design(initial, options);
assert.equal(plan.status, "active_blackbox_observation_plan");
assert.equal(plan.candidateCount, 81);
assert.equal(plan.recommendation.guaranteedEliminated, 72);
assert.ok(plan.recommendation.expectedRemaining < plan.candidateCount);

const rotationTraining = initial.concat([
  { state: [-1, -1], next: [1, -1] },
  { state: [-1, 0], next: [0, -1] },
]);
const identified = active.design(rotationTraining, options);
assert.equal(identified.status, "identified_blackbox_map");
assert.equal(identified.candidateCount, 1);

const rejected = active.design([{ state: [0, 0], next: [2, 0] }], options);
assert.equal(rejected.status, "counterexample_found");
const certificate = active.makeCertificate(initial, options);
assert.equal(active.verifyCertificate(certificate).status, "active_blackbox_observation_plan");
const tampered = JSON.parse(JSON.stringify(certificate));
tampered.result.recommendation.state = [0, 1];
assert.equal(active.verifyCertificate(tampered).status, "invalid_certificate");
assert.throws(() => active.design(initial, { maxMapDegree: 2 }), /一次映射/);

const comparison = experiment.compare();
assert.equal(comparison.evaluation, "exhaustive_finite_census");
assert.equal(comparison.targetCount, 81);
assert.equal(comparison.active.identified, 81);
assert.ok(comparison.active.meanSteps < comparison.passiveUniform.meanSteps);
assert.equal(comparison.active.meanSteps, comparison.fixedDiagonal.meanSteps);
console.log("decoder_blackbox_active_design_test: passed");
