const assert = require("node:assert/strict");
const engine = require("./conjecture_engine.js");
const graph = require("./graph_experiment.js");

const arithmetic = Array.from({ length: 20 }, (_, i) => 3 + 4 * i);
const sequence = engine.sequenceConjecture(arithmetic, 4);
assert.equal(sequence.status, "conjecture");
assert.equal(sequence.claim.decoder, "identity→arithmetic");
assert.equal(sequence.verify(arithmetic.slice(16)).status, "verified_composed_decoder");
const changed = arithmetic.slice(16);
changed[0] += 1;
assert.equal(sequence.verify(changed).status, "counterexample_found");

const graphConjecture = engine.graphConjecture(graph.cycle(6));
assert.equal(graphConjecture.claim.decoder, "cycle");
assert.equal(graphConjecture.verify(graph.relabel(graph.cycle(6), [2, 5, 1, 4, 0, 3])).status, "verified_conjecture_instance");

const polynomial = { terms: [{ coefficient: 1, powers: { x: 2 } }, { coefficient: 2, powers: { x: 1, y: 1 } }, { coefficient: 1, powers: { y: 2 } }] };
const polynomialConjecture = engine.polynomialConjecture(polynomial);
assert.equal(polynomialConjecture.claim.kind, "euler_homogeneous_identity");
assert.equal(polynomialConjecture.verify(polynomial).status, "verified_polynomial_analysis");
assert.equal(engine.polynomialConjecture({ terms: [{ coefficient: 1, powers: { x: 2 } }, { coefficient: 1, powers: { y: 1 } }] }).status, "uncertain");
const rotation = { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] };
const dynamicsConjecture = engine.dynamicsConjecture(rotation, 2, 1);
assert.equal(dynamicsConjecture.status, "conjecture");
assert.equal(dynamicsConjecture.verify(rotation).status, "verified_dynamics_conjecture");
const shear = { x: [{ coefficient: 1, powers: [1, 0] }, { coefficient: 1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [0, 1] }] };
assert.equal(dynamicsConjecture.verify(shear).status, "counterexample_found");
assert.equal(engine.dynamicsConjecture(rotation, 1, 1).status, "uncertain");
console.log("conjecture_engine_test: passed");
