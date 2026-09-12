// End-to-end acceptance run for the decoder framework.

const fs = require("node:fs");
const path = require("node:path");
const protocol = require("./decoder_protocol.js");
const report = require("./decoder_report.js");
const conditionExperiment = require("./dynamics_condition_experiment.js");
const resourceProfile = require("./decoder_resource_profile.js");

function run() {
  const arithmetic = Array.from({ length: 20 }, (_, i) => 3 + 4 * i);
  const rotation = { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] };
  const inputs = [
    { name: "arithmetic_sequence", input: { domain: "sequence", development: arithmetic.slice(0, 16), holdout: arithmetic.slice(16) }, expect: "verified_on_supplied_observations" },
    { name: "random_uncertainty", input: { domain: "sequence", development: [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3], holdout: [2, 3, 8, 4] }, expect: "no_certificate" },
    { name: "rotation_invariant", input: { domain: "dynamics", map: rotation, maxDegree: 2 }, expect: "verified_dynamics_invariants" },
    { name: "low_search_unknown", input: { domain: "dynamics", map: rotation, maxDegree: 1 }, expect: "no_nontrivial_invariant" },
    { name: "parameter_condition", input: { domain: "dynamics_parameterized", parameters: { a: 0, b: 1 } }, expect: "verified_parameter_condition" },
    { name: "parameter_region_unknown", input: { domain: "dynamics_parameterized", parameters: { a: 1, b: 1 } }, expect: "uncertain_parameter_region" },
    { name: "equation", input: { domain: "equation", equation: { terms: { x: 6, y: -3 }, constant: 9 } }, expect: "verified_equation" },
    { name: "polynomial_analysis", input: { domain: "polynomial_analysis", polynomial: { terms: [{ coefficient: 1, powers: { x: 2 } }, { coefficient: 2, powers: { x: 1, y: 1 } }, { coefficient: 1, powers: { y: 2 } }] } }, expect: "verified_polynomial_analysis" },
    { name: "multivariate_condition", input: { domain: "dynamics_condition_multivariate", family: "sum_shift_y", samples: [{ a: 1, b: 0, c: 0 }, { a: 0, b: 1, c: 0 }, { a: 0, b: 0, c: 1 }, { a: 2, b: 0, c: 0 }, { a: 1, b: 1, c: 0 }] }, expect: "verified_parameter_condition" },
    { name: "machine_representation", input: { domain: "machine_representation", graph: { n: 3, edges: [[0, 1], [1, 2], [0, 2]] } }, expect: "verified_machine_representation" },
  ];
  const results = inputs.map(item => { const result = protocol.decode(item.input); return { name: item.name, expected: item.expect, actual: result.verification, passed: result.verification === item.expect, result }; });
  const condition = conditionExperiment.main();
  const extensionsPassed = condition.conclusion.rotationGeneralizes && condition.conclusion.adversarialRejected;
  const resources = resourceProfile.profile(results.slice(0, 3).map(item => ({ name: item.name, run: () => protocol.decode(inputs.find(candidate => candidate.name === item.name).input) })));
  const resourcesPassed = resources.tasks.every(task => task.status !== "error");
  const output = { schemaVersion: 1, claim: "framework_acceptance", passed: results.every(item => item.passed) && extensionsPassed && resourcesPassed, counts: { total: results.length, passed: results.filter(item => item.passed).length, failed: results.filter(item => !item.passed).length }, results, extensions: { parameterCondition: condition.conclusion, resources, passed: extensionsPassed && resourcesPassed }, report: report.makeReport(results.map(item => item.result)) };
  fs.writeFileSync(path.join(__dirname, "decoder_acceptance_v1.json"), JSON.stringify(output, null, 2), "utf8");
  return output;
}

if (require.main === module) { const output = run(); console.log(`验收：${output.counts.passed}/${output.counts.total} 通过，结果=${output.passed}`); }
module.exports = { run };
