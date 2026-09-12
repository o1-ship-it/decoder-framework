const assert = require("node:assert/strict");
const acceptance = require("./decoder_acceptance.js");
const result = acceptance.run();
assert.equal(result.passed, true);
assert.equal(result.counts.failed, 0);
assert.ok(result.report.summary.length >= 4);
assert.equal(result.extensions.passed, true);
assert.equal(result.extensions.resources.tasks.length, 3);
console.log("decoder_acceptance_test: passed");
