const assert = require("node:assert/strict");
const design = require("./branching_query_design.js");

const { models, queries } = design.branchingFamily();
const result = design.analyze(models, queries);
assert.equal(result.status, "adaptive_strict_advantage");
assert.equal(result.adaptive.depth, 2);
assert.equal(result.adaptive.query.id, "root");
assert.deepEqual(result.adaptive.branches.map(branch => branch.plan.query.id).sort(), ["branch_a", "branch_b"]);
assert.equal(result.fixed.depth, 3);
assert.equal(result.fixed.witnessCount, 1);
const certificate = design.makeCertificate(models, queries);
const verification = design.verifyCertificate(certificate);
assert.equal(verification.status, "verified_finite_blackbox_query_design");
assert.equal(verification.analysisStatus, "adaptive_strict_advantage");
const tampered = JSON.parse(JSON.stringify(certificate)); tampered.result.fixed.depth = 2;
assert.equal(design.verifyCertificate(tampered).status, "invalid_certificate");

const control = design.nonBranchingFamily();
const controlResult = design.analyze(control.models, control.queries);
assert.equal(controlResult.status, "no_adaptive_advantage");
assert.equal(controlResult.adaptive.depth, 2);
assert.equal(controlResult.fixed.depth, 2);
assert.throws(() => design.validate(Array(design.MAX_MODELS + 1), queries), /不能超过/);
assert.throws(() => design.validate(models, Array(design.MAX_QUERIES + 1)), /不能超过/);
console.log("branching_query_design_test: passed");
