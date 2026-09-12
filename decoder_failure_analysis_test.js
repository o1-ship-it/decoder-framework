const assert = require("node:assert/strict");
const transfer = require("./decoder_generated_transfer.js");
const failure = require("./decoder_failure_analysis.js");

const arithmetic = transfer.families().arithmetic[0];
const plan = transfer.fitPlan(arithmetic);
assert.equal(failure.diagnose(plan, arithmetic).status, "passed");
const changed = arithmetic.slice();
changed[12] += 1;
changed[13] += 1;
changed[14] += 1;
changed[15] += 1;
assert.equal(failure.diagnose(plan, changed).status, "extrapolation_failure");
assert.equal(failure.diagnose(plan, changed).firstMismatch, 13);
const unrelated = Array.from({ length: 24 }, (_, i) => (i * i + 3) % 17);
assert.equal(failure.diagnose(plan, unrelated).status, "representation_mismatch");
assert.ok(failure.candidateSuggestions(unrelated).length > 0);
console.log("decoder_failure_analysis_test: passed");
