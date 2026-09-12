const assert = require("node:assert/strict");
const protocol = require("./decoder_protocol.js");
const resource = require("./decoder_resource_profile.js");
const tasks = [{ name: "equation", run: () => protocol.decode({ domain: "equation", equation: { terms: { x: 2 }, constant: 4 } }) }, { name: "unknown", run: () => protocol.decode({ domain: "dynamics", map: { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] }, maxDegree: 1 }) }];
const output = resource.profile(tasks);
assert.equal(output.tasks.length, 2);
assert.ok(output.tasks.every(task => task.elapsedMs >= 0));
assert.equal(output.tasks[0].status, "verified_equation");
console.log("decoder_resource_profile_test: passed");
