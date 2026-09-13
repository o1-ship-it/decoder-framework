const assert = require("node:assert/strict");
const inference = require("./piecewise_map_inference.js");

const partial = inference.analyze({
  options: { regionCount: 4, responseCount: 2 },
  training: [{ state: [0, 0], next: [3, 0] }],
  holdout: [{ state: [9, 9], next: [0, 0] }],
});
assert.equal(partial.status, "ambiguous_with_active_plan");
assert.equal(partial.initialCandidateCount, 8);
assert.equal(partial.stages.training.candidateCount, 2);
assert.equal(partial.stages.training.region, 3);
assert.equal(partial.stages.training.response, null);
assert.equal(partial.stages.holdout.candidateCount, 2);
assert.equal(partial.activeDesign.status, "no_adaptive_advantage");
assert.equal(partial.activeDesign.adaptive.depth, 1);
assert.equal(partial.activeDesign.fixed.depth, 1);

const branching = inference.analyze({
  options: { regionCount: 3, responseCount: 2 },
  training: [{ state: [7, 7], next: [0, 0] }],
  holdout: [{ state: [-2, 4], next: [0, 0] }],
});
assert.equal(branching.status, "ambiguous_with_active_plan");
assert.equal(branching.stages.holdout.candidateCount, 6);
assert.equal(branching.activeDesign.status, "adaptive_strict_advantage");
assert.equal(branching.activeDesign.adaptive.depth, 2);
assert.equal(branching.activeDesign.fixed.depth, 4);

const unique = inference.analyze({
  options: { regionCount: 2, responseCount: 2 },
  training: [{ state: [0, 0], next: [1, 0] }],
  holdout: [{ state: [1, 1], next: [1, 0] }],
});
assert.equal(unique.status, "candidate_frozen");
assert.equal(unique.stages.holdout.region, 1);
assert.equal(unique.stages.holdout.response, 1);

const holdoutCounterexample = inference.analyze({
  options: { regionCount: 2, responseCount: 2 },
  training: [{ state: [0, 0], next: [1, 0] }],
  holdout: [{ state: [1, 1], next: [7, 0] }],
});
assert.equal(holdoutCounterexample.status, "counterexample_found");
assert.equal(holdoutCounterexample.failure.stage, "holdout");

const trainingCounterexample = inference.analyze({
  options: { regionCount: 2, responseCount: 2 },
  training: [{ state: [0, 0], next: [7, 0] }],
  holdout: [{ state: [7, 7], next: [0, 0] }],
});
assert.equal(trainingCounterexample.status, "counterexample_found");
assert.equal(trainingCounterexample.failure.stage, "training");

const certificate = inference.makeCertificate({
  options: { regionCount: 3, responseCount: 2 },
  training: [{ state: [7, 7], next: [0, 0] }],
  holdout: [{ state: [-2, 4], next: [0, 0] }],
});
assert.equal(inference.verifyCertificate(certificate).status, "verified_piecewise_map_inference");
const tampered = JSON.parse(JSON.stringify(certificate));
tampered.result.stages.holdout.candidateCount = 1;
assert.equal(inference.verifyCertificate(tampered).status, "invalid_certificate");
assert.throws(() => inference.analyze({ options: { regionCount: 2, responseCount: 2 }, training: [], holdout: [{ state: [0, 0], next: [0, 0] }] }), /训练 转移数/);
console.log("piecewise_map_inference_test: passed");
