const assert = require("node:assert/strict");
const graph = require("./graph_decoder.js");
const experiment = require("./graph_experiment.js");

const source = experiment.cycle(6);
const relabeled = experiment.relabel(source, [2, 5, 1, 4, 0, 3]);
const certificate = graph.makeCertificate(source);
assert.equal(certificate.status, "candidate_frozen");
assert.equal(graph.verifyCertificate(certificate.certificate, source).status, "verified_on_graph");
assert.equal(graph.verifyCertificate(certificate.certificate, relabeled).status, "verified_on_graph");

const chorded = { n: 6, edges: [...source.edges, [0, 3]] };
assert.equal(graph.verifyCertificate(certificate.certificate, chorded).status, "counterexample_found");
assert.equal(graph.select(experiment.pathGraph(6)).winner.name, "path");
assert.equal(graph.select(experiment.star(6)).winner.name, "star");

console.log("graph_decoder_test: passed");
