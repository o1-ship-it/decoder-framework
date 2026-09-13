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

assert.throws(() => protocol.decode({ domain: "unknown" }), /domain/);
console.log("decoder_protocol_test: passed");
