const assert = require("node:assert/strict");
const decoder = require("./polynomial_decoder.js");
const verifier = require("./polynomial_verifier.js");

const original = { terms: [
  { coefficient: 2, powers: { x: 1, y: 1 } },
  { coefficient: 3, powers: { y: 2 } },
  { coefficient: 4, powers: { x: 1, y: 1 } },
  { coefficient: -2, powers: { z: 1 } },
] };
const scaled = { terms: [
  { coefficient: 6, powers: { y: 2 } },
  { coefficient: 12, powers: { x: 1, y: 1 } },
  { coefficient: -4, powers: { z: 1 } },
] };
const normalized = decoder.normalizePolynomial(original);
assert.deepEqual(normalized.terms, [
  { coefficient: 6, powers: { x: 1, y: 1 } },
  { coefficient: 3, powers: { y: 2 } },
  { coefficient: -2, powers: { z: 1 } },
]);
assert.equal(decoder.signature(original), decoder.signature(scaled), "整体倍乘和同类项应规范到同一形式");
const certificate = decoder.makeCertificate(original);
assert.equal(verifier.verifyCertificate(certificate, scaled).status, "verified_polynomial");
const wrong = { terms: [...scaled.terms.slice(0, 2), { coefficient: -6, powers: { z: 1 } }] };
assert.equal(verifier.verifyCertificate(certificate, wrong).status, "counterexample_found");
console.log("polynomial_test: passed");
