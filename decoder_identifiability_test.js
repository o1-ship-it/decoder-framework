const assert = require("node:assert/strict");
const frontier = require("./decoder_identifiability.js");

const ambiguous = frontier.distinguish([1, 3, 5, 7, 9, 11, 13], [15, 17], { maxModulus: 24, horizon: 16 });
assert.equal(ambiguous.status, "ambiguous_within_horizon");
assert.ok(ambiguous.firstDistinguishingObservation.horizon > 0);
const certificate = frontier.makeCertificate([1, 3, 5, 7, 9, 11, 13], [15, 17], { maxModulus: 24, horizon: 16 });
assert.equal(frontier.verifyCertificate(certificate).status, "ambiguous_within_horizon");
const tampered = JSON.parse(JSON.stringify(certificate)); tampered.result.firstDistinguishingObservation.horizon += 1;
assert.equal(frontier.verifyCertificate(tampered).status, "invalid_certificate");
const unique = frontier.distinguish([3, 16, 13, 15, 8, 7, 2, 11], [5, 9], { maxModulus: 20 });
assert.equal(unique.status, "identified_hidden_structure");
console.log("decoder_identifiability_test: passed");
