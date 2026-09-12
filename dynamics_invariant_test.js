const assert = require("node:assert/strict");
const dynamics = require("./dynamics_invariant.js");

const rotation = { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] };
const result = dynamics.discover(rotation, 2, 1);
assert.ok(result.invariants.some(item => dynamics.equal(item.polynomial, [
  { coefficient: 1, powers: [2, 0] }, { coefficient: 1, powers: [0, 2] },
])));
assert.ok(result.invariants.every(item => dynamics.verifyInvariant(item, rotation)));

const shear = { x: [{ coefficient: 1, powers: [1, 0] }, { coefficient: 1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [0, 1] }] };
const shearResult = dynamics.discover(shear, 2, 1);
assert.ok(shearResult.invariants.some(item => dynamics.equal(item.polynomial, [{ coefficient: 1, powers: [0, 1] }])));
assert.equal(dynamics.verifyInvariant([{ coefficient: 1, powers: [1, 0] }], shear), false);
assert.equal(dynamics.evaluate([{ coefficient: 1, powers: [2, 0] }, { coefficient: 1, powers: [0, 2] }], 3, 4), 25);
console.log("dynamics_invariant_test: passed");
