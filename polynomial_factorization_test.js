const assert = require("node:assert/strict");
const factor = require("./polynomial_factorization.js");
const verifier = require("./polynomial_factorization_verifier.js");

const input = { terms: [
  { coefficient: -2, powers: {} },
  { coefficient: -1, powers: { x: 1 } },
  { coefficient: 1, powers: { x: 2 } },
] }; // (x-2)(x+1)
const result = factor.factor(input);
assert.deepEqual(result.roots.sort((a, b) => a - b), [-1, 2]);
assert.equal(result.complete, true);
const certificate = factor.makeCertificate(input);
assert.equal(verifier.verifyCertificate(certificate, input).status, "verified_factorization");
const wrong = { terms: [{ coefficient: 1, powers: { x: 2 } }, { coefficient: 1, powers: {} }] };
assert.equal(verifier.verifyCertificate(certificate, wrong).status, "counterexample_found");
const irreducible = factor.factor({ terms: [{ coefficient: 1, powers: {} }, { coefficient: 1, powers: { x: 2 } }] });
assert.equal(irreducible.complete, false);
assert.throws(() => factor.factor({ terms: [{ coefficient: 1, powers: { x: 1, y: 1 } }] }), /单变量/);
console.log("polynomial_factorization_test: passed");
