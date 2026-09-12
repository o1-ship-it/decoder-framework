const assert = require("node:assert/strict");
const systems = require("./equation_system.js");
const verifier = require("./equation_system_verifier.js");

const original = { equations: [
  { terms: { x: 2, y: 1 }, constant: 5 },
  { terms: { x: 1, y: -1 }, constant: 1 },
] };
const equivalent = { equations: [
  { terms: { x: 4, y: 2 }, constant: 10 },
  { terms: { x: 1, y: -1 }, constant: 1 },
] };
const inconsistent = { equations: [
  { terms: { x: 2, y: 1 }, constant: 5 },
  { terms: { x: 2, y: 1 }, constant: 6 },
] };

const reduced = systems.rrefSystem(original);
assert.equal(reduced.rank, 2);
assert.equal(reduced.consistent, true);
assert.deepEqual(reduced.freeVariables, []);
assert.equal(verifier.verifyEquivalent(original, equivalent).status, "verified_row_equivalence");
assert.equal(systems.rrefSystem(inconsistent).consistent, false);
const certificate = systems.makeCertificate(original);
assert.equal(verifier.verifyCertificate(certificate, equivalent).status, "verified_system");
assert.equal(verifier.verifyConclusions(original).conclusions.unique, true);
assert.equal(verifier.verifyConclusions(inconsistent).conclusions.status, "inconsistent");
const tampered = JSON.parse(JSON.stringify(certificate));
tampered.conclusions.statements[0].equals.constant = "999";
assert.equal(verifier.verifyCertificate(tampered, original).status, "invalid_certificate");
const tamperedTrace = JSON.parse(JSON.stringify(certificate));
tamperedTrace.trace[0].factor = "1/3";
assert.equal(verifier.verifyCertificate(tamperedTrace, original).status, "invalid_certificate");
assert.equal(verifier.verifyCertificate(certificate, inconsistent).status, "counterexample_found");
assert.throws(() => systems.rrefSystem({ equations: [] }), /不能为空/);

console.log("equation_system_test: passed");
