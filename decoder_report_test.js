const assert = require("node:assert/strict");
const protocol = require("./decoder_protocol.js");
const report = require("./decoder_report.js");

const rotation = { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] };
const results = [
  protocol.decode({ domain: "dynamics", map: rotation, maxDegree: 2 }),
  protocol.decode({ domain: "dynamics", map: rotation, maxDegree: 1 }),
  protocol.decode({ domain: "dynamics_parameterized", parameters: { a: 1, b: 1 } }),
];
const output = report.makeReport(results);
assert.equal(output.schemaVersion, 1);
assert.equal(output.rows.length, 3);
assert.equal(output.summary.length, 2);
assert.equal(output.summary.find(row => row.domain === "dynamics").verified, 1);
assert.equal(output.summary.find(row => row.domain === "dynamics_parameterized").unknown, 1);
assert.equal(report.verificationStrength(results[0]), "verified");
assert.ok(report.translationCoverage(results[0]) >= 0);
console.log("decoder_report_test: passed");
