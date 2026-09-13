const assert = require("node:assert/strict");
const blackbox = require("./decoder_blackbox_dynamics.js");
const rotation = state => [-state[1], state[0]];
const points = [[0,0],[1,0],[0,1],[1,1],[-1,2],[2,-1],[3,2]];
const transitions = points.map(state => ({ state, next: rotation(state) }));
const result = blackbox.decode(transitions.slice(0, 3), transitions.slice(3), { maxMapDegree: 1, maxInvariantDegree: 2 });
assert.equal(result.status, "verified_blackbox_structure");
assert.ok(result.invariantCertificate.invariants.some(item => item.rule.includes("x^2") && item.rule.includes("y^2")));
const certificate = blackbox.makeCertificate(transitions.slice(0, 3), transitions.slice(3), { maxMapDegree: 1, maxInvariantDegree: 2 });
assert.equal(blackbox.verifyCertificate(certificate).status, "verified_blackbox_structure");
const underdetermined = blackbox.decode(transitions.slice(0, 2), transitions.slice(2, 3), { maxMapDegree: 1 });
assert.equal(underdetermined.status, "uncertain_blackbox_map");
const rankDeficient = blackbox.decode([
  { state: [0, 0], next: [0, 0] },
  { state: [0, 0], next: [0, 0] },
  { state: [0, 0], next: [0, 0] },
], [{ state: [1, 0], next: [0, 1] }], { maxMapDegree: 1 });
assert.equal(rankDeficient.status, "uncertain_blackbox_map");
const inconsistentTraining = blackbox.decode([
  { state: [0, 0], next: [0, 0] },
  { state: [1, 0], next: [0, 1] },
  { state: [0, 1], next: [-1, 0] },
  { state: [0, 1], next: [0, 0] },
], [{ state: [1, 1], next: [-1, 1] }], { maxMapDegree: 1 });
assert.equal(inconsistentTraining.status, "uncertain_blackbox_map");

const tamperedInvariant = JSON.parse(JSON.stringify(certificate));
tamperedInvariant.result.invariantCertificate.invariants[0].rule = "tampered";
assert.equal(blackbox.verifyCertificate(tamperedInvariant).status, "invalid_certificate");

const tamperedMap = JSON.parse(JSON.stringify(certificate));
tamperedMap.result.inference.map.x[0].coefficient += 1;
assert.equal(blackbox.verifyCertificate(tamperedMap).status, "invalid_certificate");

const rejectedCertificate = blackbox.makeCertificate(transitions.slice(0, 3), [{ state: [1, 1], next: [0, 0] }], { maxMapDegree: 1, maxInvariantDegree: 2 });
assert.equal(blackbox.verifyCertificate(rejectedCertificate).status, "counterexample_found");
const uncertainCertificate = blackbox.makeCertificate([
  { state: [0, 0], next: [0, 0] },
  { state: [0, 0], next: [0, 0] },
  { state: [0, 0], next: [0, 0] },
], [{ state: [1, 0], next: [0, 1] }], { maxMapDegree: 1 });
assert.equal(blackbox.verifyCertificate(uncertainCertificate).status, "uncertain_blackbox_map");
assert.throws(() => blackbox.decode(transitions.slice(0, 3), transitions.slice(3), { maxMapDegree: 3 }), /1\.\.2/);
console.log("decoder_blackbox_dynamics_test: passed");
