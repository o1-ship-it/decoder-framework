const assert = require("node:assert/strict");
const family = require("./parametric_branching_family.js");
const queryDesign = require("./branching_query_design.js");

for (let branchCount = 1; branchCount <= family.MAX_BRANCHES; branchCount += 1) {
  for (let variantCount = 1; variantCount <= Math.min(family.MAX_VARIANTS, Math.floor(queryDesign.MAX_MODELS / branchCount)); variantCount += 1) {
    if (branchCount * variantCount < 2) continue;
    const result = family.analyze({ branchCount, variantCount });
    const theorem = family.expectedTheorem({ branchCount, variantCount });
    assert.equal(result.formulaMatches, true);
    assert.equal(result.status, theorem.status);
    assert.equal(result.exact.adaptive.depth, theorem.adaptiveDepth);
    assert.equal(result.exact.fixed.depth, theorem.fixedDepth);
  }
}
const exhaustive = family.exhaustiveCheck();
assert.deepEqual(exhaustive, { total: 33, formulaMatches: 33, strictAdvantages: 19, noAdvantages: 14 });

const heldOut = family.analyze({ branchCount: 4, variantCount: 2 });
assert.equal(heldOut.status, "adaptive_strict_advantage");
assert.equal(heldOut.exact.adaptive.depth, 2);
assert.equal(heldOut.exact.fixed.depth, 5);

const control = family.analyze({ branchCount: 4, variantCount: 1 });
assert.equal(control.status, "no_adaptive_advantage");
assert.equal(control.exact.adaptive.depth, 1);
assert.equal(control.exact.fixed.depth, 1);

const certificate = family.makeCertificate({ branchCount: 3, variantCount: 3 });
assert.equal(family.verifyCertificate(certificate).status, "verified_parametric_branching_query_family");
const tampered = JSON.parse(JSON.stringify(certificate));
tampered.result.theorem.fixedDepth = 1;
assert.equal(family.verifyCertificate(tampered).status, "invalid_certificate");
assert.throws(() => family.normalizeOptions({ branchCount: 8, variantCount: 3 }), /不能超过/);
console.log("parametric_branching_family_test: passed");
