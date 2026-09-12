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

assert.throws(() => protocol.decode({ domain: "unknown" }), /domain/);
console.log("decoder_protocol_test: passed");
