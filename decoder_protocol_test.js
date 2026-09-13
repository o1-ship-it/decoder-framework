const assert = require("node:assert/strict");
const protocol = require("./decoder_protocol.js");
const graphExperiment = require("./graph_experiment.js");

const arithmetic = Array.from({ length: 20 }, (_, i) => 3 + 4 * i);
const sequenceResult = protocol.decode({ domain: "sequence", development: arithmetic.slice(0, 16), holdout: arithmetic.slice(16) });
assert.equal(sequenceResult.domain, "sequence");
assert.equal(sequenceResult.decoder, "arithmetic");
assert.equal(sequenceResult.residual, 0);

const cycle = graphExperiment.cycle(6);
const graphResult = protocol.decode({ domain: "graph", graph: cycle });
assert.equal(graphResult.domain, "graph");
assert.equal(graphResult.decoder, "cycle");
assert.equal(graphResult.residual, 0);

const systemResult = protocol.decode({ domain: "equation_system", system: { equations: [
  { terms: { x: 2, y: 1 }, constant: 5 },
  { terms: { x: 1, y: -1 }, constant: 1 },
] } });
assert.equal(systemResult.domain, "equation_system");
assert.equal(systemResult.hypothesis.rank, 2);
assert.equal(systemResult.residual, 0);

const generatedResult = protocol.decode({
  domain: "generated_sequence",
  sequence: [1, 2, 4, 7, 12, 20, 33, 54, 88, 143, 232, 376, 609, 986, 1596, 2583, 4180, 6764],
  horizon: 2,
});
assert.equal(generatedResult.status, "candidate_frozen");
assert.equal(generatedResult.residual, 0);

const branchingResult = protocol.decode({ domain: "blackbox_branching_query_design" });
assert.equal(branchingResult.verification, "verified_finite_blackbox_query_design");
assert.equal(branchingResult.analysisStatus, "adaptive_strict_advantage");
const controlResult = protocol.decode({ domain: "blackbox_branching_query_design", models: [
  { id: "C1", transitions: { first: [0, 0], second: [0, 0] } },
  { id: "C2", transitions: { first: [0, 0], second: [1, 0] } },
  { id: "C3", transitions: { first: [1, 0], second: [0, 0] } },
  { id: "C4", transitions: { first: [1, 0], second: [1, 0] } },
], queries: [{ id: "first", state: [0, 0] }, { id: "second", state: [1, 0] }] });
assert.equal(controlResult.analysisStatus, "no_adaptive_advantage");

const parametricResult = protocol.decode({ domain: "blackbox_parametric_query_design", options: { branchCount: 4, variantCount: 2 } });
assert.equal(parametricResult.verification, "verified_parametric_branching_query_family");
assert.equal(parametricResult.analysisStatus, "adaptive_strict_advantage");
assert.deepEqual(parametricResult.hypothesis, { family: "regime_selected_local_response", branchCount: 4, variantCount: 2, adaptiveDepth: 2, fixedDepth: 5, querySavings: 3 });
const parametricControl = protocol.decode({ domain: "blackbox_parametric_query_design", options: { branchCount: 4, variantCount: 1 } });
assert.equal(parametricControl.analysisStatus, "no_adaptive_advantage");
assert.equal(parametricControl.hypothesis.querySavings, 0);

const piecewiseResult = protocol.decode({ domain: "blackbox_piecewise_map_query_design", options: { regionCount: 4, responseCount: 2 } });
assert.equal(piecewiseResult.verification, "verified_piecewise_map_query_family");
assert.equal(piecewiseResult.analysisStatus, "adaptive_strict_advantage");
assert.equal(piecewiseResult.hypothesis.adaptiveDepth, 2);
assert.equal(piecewiseResult.hypothesis.fixedDepth, 5);
const piecewiseControl = protocol.decode({ domain: "blackbox_piecewise_map_query_design", options: { regionCount: 4, responseCount: 1 } });
assert.equal(piecewiseControl.analysisStatus, "no_adaptive_advantage");

const piecewiseInference = protocol.decode({ domain: "blackbox_piecewise_map_inference", options: { regionCount: 2, responseCount: 2 }, training: [{ state: [0, 0], next: [1, 0] }], holdout: [{ state: [1, 1], next: [1, 0] }] });
assert.equal(piecewiseInference.verification, "verified_piecewise_map_inference");
assert.equal(piecewiseInference.hypothesis.region, 1);
assert.equal(piecewiseInference.hypothesis.response, 1);
const piecewiseInferenceCounterexample = protocol.decode({ domain: "blackbox_piecewise_map_inference", options: { regionCount: 2, responseCount: 2 }, training: [{ state: [0, 0], next: [1, 0] }], holdout: [{ state: [1, 1], next: [7, 0] }] });
assert.equal(piecewiseInferenceCounterexample.verification, "counterexample_found");

assert.throws(() => protocol.decode({ domain: "unknown" }), /domain/);
console.log("decoder_protocol_test: passed");
