const assert = require("node:assert/strict");
const experiment = require("./graph_experiment.js");
const discovery = require("./graph_invariant_discovery.js");
const invariantExperiment = require("./graph_invariant_experiment.js");

const cycle = experiment.cycle(6);
const relabeled = experiment.relabel(cycle, [2, 5, 1, 4, 0, 3]);
const triangles = invariantExperiment.disjointTriangles();

assert.equal(discovery.compare(cycle, relabeled).sameInvariant, true);
assert.equal(discovery.compare(cycle, relabeled).isomorphicForSmallGraph, true);
assert.equal(discovery.compare(cycle, triangles).sameInvariant, true);
assert.equal(discovery.compare(cycle, triangles).isomorphicForSmallGraph, false);
assert.ok(discovery.collisionGroups({ cycle, triangles }).length >= 1);

console.log("graph_invariant_test: passed");
