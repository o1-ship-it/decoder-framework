const assert = require("node:assert/strict");
const dynamics = require("./dynamics_invariant.js");
const general = require("./dynamics_condition_general.js");
const identity = { x: [{ coefficient: 1, powers: [1, 0] }], y: [{ coefficient: 1, powers: [0, 1] }] };
const invariant = dynamics.discoverLinear(identity, 1).invariants.find(item => item.rule === "1x^0y^1");
function family({ c }) { return { x: [{ coefficient: 1, powers: [1, 0] }], y: [{ coefficient: 1 + c, powers: [0, 1] }] }; }
const result = general.inferLinearCondition(family, invariant, "c", [{ c: -1 }, { c: 0 }, { c: 1 }, { c: 2 }], [0, 1]);
assert.equal(result.condition, "c + 0=0");
assert.equal(result.status, "verified_parameter_condition");
assert.throws(() => general.inferLinearCondition(family, invariant, "c", [{ c: 1 }, { c: 1 }]), /没有变化/);
function quadraticFamily({ c }) { return { x: [{ coefficient: 1, powers: [1, 0] }], y: [{ coefficient: c, powers: [0, 1] }] }; }
const quadraticInvariant = dynamics.discoverLinear(identity, 2).invariants.find(item => item.rule === "1x^0y^2");
const quadratic = general.inferPolynomialCondition(quadraticFamily, quadraticInvariant, "c", [{ c: -1 }, { c: 0 }, { c: 1 }, { c: 2 }], 2, [0, 1]);
assert.equal(quadratic.condition, "-1 + c^2=0");
assert.equal(quadratic.status, "verified_parameter_condition");
function bivariateFamily({ a, b }) { return { x: [{ coefficient: 1, powers: [1, 0] }], y: [{ coefficient: a + b, powers: [0, 1] }] }; }
const bivariate = general.inferBivariateLinearCondition(bivariateFamily, invariant, [{ a: 0, b: 0 }, { a: 1, b: 0 }, { a: 0, b: 1 }, { a: 2, b: -1 }], [0, 1]);
assert.equal(bivariate.condition, "1 a + 1 b + -1=0");
assert.equal(bivariate.status, "verified_parameter_condition");
console.log("dynamics_condition_general_test: passed");
