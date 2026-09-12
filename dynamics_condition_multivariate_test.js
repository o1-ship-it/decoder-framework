const assert = require("node:assert/strict");
const dynamics = require("./dynamics_invariant.js");
const multi = require("./dynamics_condition_multivariate.js");
const invariant = [{ coefficient: 1, powers: [0, 1] }];
function family({ a, b, c }) { return { x: [{ coefficient: 1, powers: [1, 0] }], y: [{ coefficient: 1, powers: [0, 1] }, { coefficient: a + b + c - 1, powers: [0, 0] }] }; }
const result = multi.inferLinearCondition(family, { polynomial: invariant }, ["a", "b", "c"], [{ a: 1, b: 0, c: 0 }, { a: 0, b: 1, c: 0 }, { a: 0, b: 0, c: 1 }, { a: 2, b: 0, c: 0 }, { a: 1, b: 1, c: 0 }]);
assert.equal(result.condition, "-1 + a + b + c=0");
assert.equal(result.status, "verified_parameter_condition");
assert.throws(() => multi.inferLinearCondition(family, { polynomial: invariant }, ["a", "b", "c"], [{ a: 1, b: 0, c: 0 }, { a: 1, b: 0, c: 0 }, { a: 0, b: 1, c: 0 }, { a: 0, b: 0, c: 1 }, { a: 2, b: 0, c: 0 }]), /秩不足/);
console.log("dynamics_condition_multivariate_test: passed");
