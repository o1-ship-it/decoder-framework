const assert = require("node:assert/strict");
const family = require("./piecewise_map_family.js");

assert.deepEqual(family.regionOf([0, 0], 3), "origin");
assert.deepEqual(family.regionOf([2, 1], 3), "local_2");
assert.deepEqual(family.regionOf([4, 1], 3), "background");
assert.deepEqual(family.evaluateMap({ regionCount: 3, region: 2, response: 1 }, [0, 0]), [2, 0]);
assert.deepEqual(family.evaluateMap({ regionCount: 3, region: 2, response: 1 }, [2, 1]), [1, 0]);
assert.deepEqual(family.evaluateMap({ regionCount: 3, region: 2, response: 1 }, [1, 1]), [0, 0]);

const exhaustive = family.exhaustiveCheck();
assert.deepEqual(exhaustive, { total: 33, formulaMatches: 33, strictAdvantages: 19, noAdvantages: 14 });
const heldOut = family.analyze({ regionCount: 4, responseCount: 2 });
assert.equal(heldOut.status, "adaptive_strict_advantage");
assert.equal(heldOut.exact.adaptive.depth, 2);
assert.equal(heldOut.exact.fixed.depth, 5);
const control = family.analyze({ regionCount: 4, responseCount: 1 });
assert.equal(control.status, "no_adaptive_advantage");
assert.equal(control.exact.adaptive.depth, 1);
assert.equal(control.exact.fixed.depth, 1);
const certificate = family.makeCertificate({ regionCount: 3, responseCount: 3 });
assert.equal(family.verifyCertificate(certificate).status, "verified_piecewise_map_query_family");
const tampered = JSON.parse(JSON.stringify(certificate));
tampered.result.mapRule = "tampered";
assert.equal(family.verifyCertificate(tampered).status, "invalid_certificate");
assert.throws(() => family.normalizeOptions({ regionCount: 8, responseCount: 3 }), /候选分段映射数/);
console.log("piecewise_map_family_test: passed");
