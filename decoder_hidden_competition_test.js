const assert = require("node:assert/strict");
const competition = require("./decoder_hidden_competition.js");

const modular = [3, 16, 13, 15, 8, 7, 2, 11];
const result = competition.compete(modular, [5, 9], [12, 10], { maxModulus: 20 });
assert.equal(result.status, "verified_unique_hidden_structure");
assert.equal(result.winners[0].family, "modular_affine");
const certificate = competition.makeCertificate(modular, [5, 9], [12, 10], { maxModulus: 20 });
assert.equal(competition.verifyCertificate(certificate).status, "verified_unique_hidden_structure");
const tampered = JSON.parse(JSON.stringify(certificate)); tampered.result.winners[0].family = "affine";
assert.equal(competition.verifyCertificate(tampered).status, "invalid_certificate");
const arithmetic = competition.compete([1, 3, 5, 7, 9, 11, 13], [15, 17]);
assert.equal(arithmetic.status, "ambiguous_hidden_structure");
const unknown = competition.compete([3, 1, 4, 1, 5, 9], [2, 6]);
assert.equal(unknown.status, "uncertain_hidden_structure");
console.log("decoder_hidden_competition_test: passed");
