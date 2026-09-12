const assert = require("node:assert/strict");
const parameterized = require("./dynamics_parameterized.js");

const rotation = parameterized.makeCertificate({ a: 0, b: 1 });
assert.equal(rotation.condition, "a^2+b^2=1");
assert.equal(parameterized.verifyCertificate(rotation, { a: 0, b: 1 }).status, "verified_parameter_condition");
assert.equal(parameterized.discover({ a: 1, b: 1 }).candidates.length, 0);
assert.equal(parameterized.verifyCertificate(rotation, { a: 1, b: 1 }).status, "counterexample_found");
const tampered = JSON.parse(JSON.stringify(rotation));
tampered.condition = "a=0";
assert.equal(parameterized.verifyCertificate(tampered, { a: 0, b: 1 }).status, "invalid_certificate");
assert.throws(() => parameterized.discover({ a: 0.5, b: 1 }), /安全整数/);
console.log("dynamics_parameterized_test: passed");
