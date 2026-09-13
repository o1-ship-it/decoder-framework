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
const noisy = v1.decodeObject({ domain: "noisy_sequence", development: [3, 8, 11, 16, 19, 24], holdout: [27, 32], tolerance: 1 });
assert.equal(noisy.verification, "verified_noisy_sequence");
const multiCondition = v1.decodeObject({ domain: "dynamics_condition_multivariate", family: "sum_shift_y", samples: [{ a: 1, b: 0, c: 0 }, { a: 0, b: 1, c: 0 }, { a: 0, b: 0, c: 1 }, { a: 2, b: 0, c: 0 }, { a: 1, b: 1, c: 0 }] });
assert.equal(multiCondition.verification, "verified_parameter_condition");
const machine = v1.decodeObject({ domain: "machine_representation", graph: { n: 3, edges: [[0, 1], [1, 2], [0, 2]] } });
assert.equal(machine.verification, "verified_machine_representation");
const machineSearch = v1.decodeObject({ domain: "machine_decoder_search", examples: [{ graph: { n: 3, edges: [[0,1],[1,2],[2,0]] }, label: "cycle" }, { graph: { n: 4, edges: [[0,1],[1,2],[2,3],[3,0]] }, label: "cycle" }], holdout: [{ graph: { n: 5, edges: [[0,1],[1,2],[2,3],[3,4],[4,0]] }, label: "cycle" }] });
assert.equal(machineSearch.verification, "verified_machine_decoder");
const hidden = v1.decodeObject({ domain: "hidden_sequence", development: [3, 16, 13, 15, 8, 7, 2, 11], holdout: [5, 9], options: { maxModulus: 20 } });
assert.equal(hidden.verification, "verified_hidden_structure");
const competed = v1.decodeObject({ domain: "hidden_sequence_competition", development: [3, 16, 13, 15, 8, 7, 2, 11], holdout: [5, 9], options: { maxModulus: 20 } });
assert.equal(competed.verification, "verified_unique_hidden_structure");
const frontier = v1.decodeObject({ domain: "hidden_identifiability", development: [1, 3, 5, 7, 9, 11, 13], holdout: [15, 17], options: { maxModulus: 24, horizon: 16 } });
assert.equal(frontier.verification, "ambiguous_within_horizon");
const active = v1.decodeObject({ domain: "active_observation_design", development: [1, 3, 5, 7, 9, 11, 13], holdout: [15, 17], options: { maxModulus: 24, horizon: 8 } });
assert.equal(active.verification, "active_disambiguation_plan");
const noisyActive = v1.decodeObject({ domain: "noisy_active_observation_design", development: [1, 3, 5, 7, 9, 11, 13], holdout: [15, 17], options: { maxModulus: 24, tolerance: 1, horizon: 8 } });
assert.equal(noisyActive.verification, "noise_robust_disambiguation_plan");
const equivalence = v1.decodeObject({ domain: "observational_equivalence", development: [1, 3, 5, 7, 9, 11, 13], holdout: [15, 17], options: { maxModulus: 24, horizon: 8 } });
assert.equal(equivalence.verification, "observationally_distinguishable");
const composedDynamics = v1.decodeObject({ domain: "composed_dynamics", map: { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] }, options: { transforms: ["identity", "swap"], maxDegree: 2 } });
assert.equal(composedDynamics.verification, "verified_composed_dynamics");
const blackboxDynamics = v1.decodeObject({ domain: "blackbox_dynamics", training: [{ state: [0, 0], next: [0, 0] }, { state: [1, 0], next: [0, 1] }, { state: [0, 1], next: [-1, 0] }], holdout: [{ state: [1, 1], next: [-1, 1] }], options: { maxMapDegree: 1, maxInvariantDegree: 2 } });
assert.equal(blackboxDynamics.verification, "verified_blackbox_structure");
const blackboxCounterexample = v1.decodeObject({ domain: "blackbox_dynamics", training: [{ state: [0, 0], next: [0, 0] }, { state: [1, 0], next: [0, 1] }, { state: [0, 1], next: [-1, 0] }], holdout: [{ state: [1, 1], next: [0, 0] }], options: { maxMapDegree: 1, maxInvariantDegree: 2 } });
assert.equal(blackboxCounterexample.status, "counterexample_found");
assert.equal(blackboxCounterexample.verification, "counterexample_found");
const blackboxPlan = v1.decodeObject({ domain: "blackbox_active_observation_design", training: [{ state: [0, 0], next: [0, 0] }], options: { stateMin: -1, stateMax: 1 } });
assert.equal(blackboxPlan.verification, "active_blackbox_observation_plan");
assert.equal(blackboxPlan.recommendation.guaranteedEliminated, 72);
const branchingQuery = v1.decodeObject({ domain: "blackbox_branching_query_design" });
assert.equal(branchingQuery.verification, "verified_finite_blackbox_query_design");
assert.equal(branchingQuery.analysisStatus, "adaptive_strict_advantage");
assert.equal(branchingQuery.hypothesis.adaptiveDepth, 2);
assert.equal(branchingQuery.hypothesis.fixedDepth, 3);

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
