const dynamics = require("./dynamics_invariant.js");
const resource = require("./decoder_resource_profile.js");

function compareDynamics(map, maxDegree = 2, coefficientRange = 1) {
  const tasks = [
    { name: "enumeration", run: () => dynamics.discover(map, maxDegree, coefficientRange) },
    { name: "linear_nullspace", run: () => dynamics.discoverLinear(map, maxDegree) },
  ];
  const profiled = resource.profile(tasks);
  return { domain: "dynamics", maxDegree, coefficientRange, methods: profiled.tasks.map(item => ({ name: item.name, elapsedMs: item.elapsedMs, candidateCount: item.candidateCount, status: item.status })) };
}

module.exports = { compareDynamics };
