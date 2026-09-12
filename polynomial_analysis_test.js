const assert = require("node:assert/strict");
const analysis = require("./polynomial_analysis.js");
const verifier = require("./polynomial_analysis_verifier.js");

const homogeneous = { terms: [
  { coefficient: 1, powers: { x: 2 } },
  { coefficient: 2, powers: { x: 1, y: 1 } },
  { coefficient: 1, powers: { y: 2 } },
] };
const nonhomogeneous = { terms: [
  { coefficient: 1, powers: { x: 2 } },
  { coefficient: 1, powers: { y: 1 } },
] };
const result = analysis.analyze(homogeneous);
assert.equal(result.homogeneous, true);
assert.equal(result.totalDegree, 2);
assert.equal(result.eulerIdentity, true);
assert.deepEqual(result.derivatives.x.terms, [{ coefficient: 1, powers: { x: 1 } }, { coefficient: 1, powers: { y: 1 } }]);
assert.equal(analysis.analyze(nonhomogeneous).homogeneous, false);
const certificate = analysis.makeCertificate(homogeneous);
assert.equal(verifier.verifyCertificate(certificate, homogeneous).status, "verified_polynomial_analysis");
const tampered = JSON.parse(JSON.stringify(certificate));
tampered.analysis.eulerIdentity = false;
assert.equal(verifier.verifyCertificate(tampered, homogeneous).status, "invalid_certificate");
console.log("polynomial_analysis_test: passed");
