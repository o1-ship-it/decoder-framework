const assert = require("node:assert/strict");
const v1 = require("./decoder_v1.js");
const graph = require("./graph_experiment.js");

const arithmetic = Array.from({ length: 20 }, (_, i) => 3 + 4 * i);
const sequence = v1.decodeObject({ domain: "sequence", development: arithmetic.slice(0, 16), holdout: arithmetic.slice(16) });
assert.equal(sequence.domain, "sequence");
assert.equal(sequence.residual, 0);

const equation = v1.decodeObject({ domain: "equation", equation: { terms: { x: 6, y: -3 }, constant: 9 } });
assert.equal(equation.verification, "verified_equation");

const factorization = v1.decodeObject({ domain: "polynomial_factor", polynomial: { terms: [
  { coefficient: -2, powers: {} }, { coefficient: -1, powers: { x: 1 } }, { coefficient: 1, powers: { x: 2 } },
] } });
assert.equal(factorization.verification, "verified_factorization");

const dynamics = v1.decodeObject({ domain: "dynamics", map: { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] }, maxDegree: 2, coefficientRange: 1 });
assert.equal(dynamics.verification, "verified_dynamics_invariants");
assert.ok(dynamics.hypothesis.some(item => item.rule.includes("x^2y^0") && item.rule.includes("x^0y^2")));
const parameterized = v1.decodeObject({ domain: "dynamics_parameterized", parameters: { a: 0, b: 1 } });
assert.equal(parameterized.verification, "verified_parameter_condition");

const batch = v1.decodeBatch([
  { domain: "graph", graph: graph.cycle(6) },
  { domain: "equation_system", system: { equations: [{ terms: { x: 1 }, constant: 2 }] } },
  { domain: "unknown" },
]);
assert.equal(batch.summary.total, 3);
assert.equal(batch.summary.accepted, 2);
assert.equal(batch.summary.inputErrors, 1);
assert.deepEqual(batch.summary.domains.sort(), ["equation_system", "graph"]);
console.log("decoder_v1_test: passed");
