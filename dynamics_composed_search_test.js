const assert = require("node:assert/strict");
const composed = require("./dynamics_composed_search.js");
const rotation = { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] };
const certificate = composed.makeCertificate(rotation, { transforms: ["identity", "swap", "rotate90"], maxDegree: 2 });
assert.ok(certificate.candidates.length > 0);
assert.equal(composed.verifyCertificate(certificate, rotation).status, "verified_composed_dynamics");
const tampered = JSON.parse(JSON.stringify(certificate)); tampered.candidates[0].originalRule = "tampered";
assert.equal(composed.verifyCertificate(tampered, rotation).status, "invalid_certificate");
console.log("dynamics_composed_search_test: passed");
