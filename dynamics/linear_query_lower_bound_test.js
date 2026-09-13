const assert = require("node:assert/strict");
const lowerBound = require("./linear_query_lower_bound.js");

const proof = lowerBound.prove({ coefficientRange: 1 });
assert.equal(proof.candidateCount, 81);
assert.ok(proof.maxOneQueryOutputs < proof.candidateCount);
assert.equal(proof.lowerBoundQueries, 2);
assert.equal(proof.upperBoundQueries, 2);
assert.equal(proof.optimalQueryCount, 2);
assert.equal(proof.adaptiveLowerBound, 2);
assert.equal(lowerBound.verify(proof).status, "verified_linear_query_optimality");
const tampered = JSON.parse(JSON.stringify(proof)); tampered.optimalQueryCount = 1;
assert.equal(lowerBound.verify(tampered).status, "invalid_certificate");
console.log("linear_query_lower_bound_test: passed");
