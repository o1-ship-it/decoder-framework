const assert = require("node:assert/strict");
const family = require("./dynamics_family.js");

function rotationScaling(parameters) {
  const { a, b } = parameters;
  return { x: [{ coefficient: a, powers: [1, 0] }, { coefficient: -b, powers: [0, 1] }], y: [{ coefficient: b, powers: [1, 0] }, { coefficient: a, powers: [0, 1] }] };
}

const certificate = family.makeCertificate(rotationScaling, [{ a: 0, b: 1 }, { a: 1, b: 0 }, { a: 0, b: -1 }], 2);
assert.ok(certificate.invariants.some(item => item.rule === "1x^0y^2 + 1x^2y^0"));
assert.equal(family.verifyCertificate(certificate, rotationScaling, { a: -1, b: 0 }).status, "verified_family_instance");
assert.equal(family.verifyCertificate(certificate, rotationScaling, { a: 1, b: 1 }).status, "counterexample_found");
assert.throws(() => family.discoverCommonInvariants(rotationScaling, [], 2), /非空样本/);
console.log("dynamics_family_test: passed");
