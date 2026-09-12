const assert = require("node:assert/strict");
const generator = require("./decoder_generator.js");
const verifier = require("./decoder_generator_verifier.js");

const fib = [1, 1];
while (fib.length < 20) fib.push(fib.at(-1) + fib.at(-2));
let total = 0;
const cumulative = fib.map(value => { total += value; return total; });
const certificateResult = generator.createCertificate(cumulative, 4, [8, 10, 12], 2);
assert.equal(certificateResult.status, "candidate_frozen");
const holdout = fib.slice(20, 24); // empty: certificate still checks its stored forecast
assert.equal(verifier.verifyCertificate(certificateResult.certificate, holdout).status, "verified_composed_decoder");
const tampered = JSON.parse(JSON.stringify(certificateResult.certificate));
tampered.forecast[0] = String(BigInt(tampered.forecast[0]) + 1n);
assert.equal(verifier.verifyCertificate(tampered).status, "invalid_certificate");
console.log("decoder_generator_certificate_test: passed");
