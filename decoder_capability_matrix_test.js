const assert = require("node:assert/strict");
const matrix = require("./decoder_capability_matrix.js");

const tasks = [
  { id: "cal_modular", partition: "calibration", train: [3, 16, 13, 15, 8, 7, 2, 11], test: [5, 9], stress: [12, 10], options: { maxModulus: 20 }, expected: "verified_unique_hidden_structure" },
  { id: "cal_unknown", partition: "calibration", train: [3, 1, 4, 1, 5, 9], test: [2, 6], stress: [5, 3], options: { maxModulus: 8 }, expected: "uncertain_hidden_structure" },
  { id: "test_ambiguous", partition: "test", train: [1, 3, 5, 7, 9, 11, 13], test: [15, 17], stress: [19, 21], options: { maxModulus: 24 }, expected: "ambiguous_hidden_structure" },
];
const result = matrix.runMatrix(tasks);
assert.equal(result.test.summary.ambiguous, 1);
assert.equal(result.test.summary.coverage, 1);
const certificate = matrix.makeCertificate(tasks);
assert.equal(matrix.verifyCertificate(certificate).status, "verified_capability_matrix");
const tampered = JSON.parse(JSON.stringify(certificate)); tampered.result.test.rows[0].actual = "uncertain_hidden_structure";
assert.equal(matrix.verifyCertificate(tampered).status, "invalid_certificate");
console.log("decoder_capability_matrix_test: passed");
