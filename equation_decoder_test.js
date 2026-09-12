const assert = require("node:assert/strict");
const decoder = require("./equation_decoder.js");
const verifier = require("./equation_verifier.js");

const original = { terms: { x: 6, y: -3 }, constant: 9 };
const scaled = { terms: { x: 12, y: -6 }, constant: 18 };
const renamed = { terms: { u: 2, v: -1 }, constant: 3 };
assert.deepEqual(decoder.normalizeEquation(original), { terms: { x: 2, y: -1 }, constant: 3 });
assert.equal(verifier.equalEquation(original, scaled), true);
assert.equal(verifier.verifyRenameEquivalence(original, renamed, { x: "u", y: "v" }).status, "verified_under_rename");
const certificate = decoder.makeCertificate(original);
assert.equal(verifier.verifyCertificate(certificate, scaled).status, "verified_equation");
assert.equal(verifier.verifyCertificate(certificate, { terms: { x: 6, y: -3 }, constant: 10 }).status, "counterexample_found");
assert.throws(() => decoder.normalizeEquation({ terms: {}, constant: 0 }), /至少/);
console.log("equation_decoder_test: passed");
