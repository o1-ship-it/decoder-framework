const assert = require("node:assert/strict");
const dynamics = require("./dynamics_invariant.js");
const verifier = require("./dynamics_invariant_verifier.js");
const protocol = require("./decoder_protocol.js");

const rotation = { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] };
const shear = { x: [{ coefficient: 1, powers: [1, 0] }, { coefficient: 1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [0, 1] }] };

const rotationCertificate = dynamics.makeCertificate(rotation, 2, 1);
assert.equal(verifier.verifyCertificate(rotationCertificate, rotation).status, "verified_dynamics_invariants");
const shearCertificate = dynamics.makeCertificate(shear, 2, 1);
assert.equal(verifier.verifyCertificate(shearCertificate, shear).status, "verified_dynamics_invariants");
const linearCertificate = dynamics.makeCertificate(rotation, 2, 1, "linear_nullspace");
assert.equal(linearCertificate.search.method, "linear_nullspace");
assert.deepEqual(linearCertificate.invariants.map(item => item.rule), ["1x^0y^2 + 1x^2y^0"]);
assert.equal(verifier.verifyCertificate(linearCertificate, rotation).status, "verified_dynamics_invariants");

const tamperedInvariant = JSON.parse(JSON.stringify(rotationCertificate));
tamperedInvariant.invariants[0].rule = "tampered";
assert.notEqual(verifier.verifyCertificate(tamperedInvariant, rotation).status, "verified_dynamics_invariants");
const tamperedRepresentation = JSON.parse(JSON.stringify(rotationCertificate));
tamperedRepresentation.representation.candidateCount = 99;
assert.equal(verifier.verifyCertificate(tamperedRepresentation, rotation).status, "invalid_certificate");

const tamperedMap = { ...rotation, y: [{ coefficient: 2, powers: [1, 0] }] };
assert.equal(verifier.verifyCertificate(rotationCertificate, tamperedMap).status, "counterexample_found");

const narrow = dynamics.makeCertificate(rotation, 1, 1);
const narrowResult = verifier.verifyCertificate(narrow, rotation);
assert.equal(narrowResult.status, "verified_dynamics_invariants");
assert.equal(narrowResult.invariantCount, 0);
assert.equal(protocol.decode({ domain: "dynamics", map: rotation, maxDegree: 1, coefficientRange: 1 }).status, "uncertain");
assert.throws(() => dynamics.discover(rotation, 2, 4), /系数范围/);
console.log("dynamics_certificate_test: passed");
