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
    { name: "machine_decoder_search", input: { domain: "machine_decoder_search", examples: [{ graph: { n: 3, edges: [[0, 1], [1, 2], [2, 0]] }, label: "cycle" }, { graph: { n: 4, edges: [[0, 1], [1, 2], [2, 3], [3, 0]] }, label: "cycle" }], holdout: [{ graph: { n: 5, edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]] }, label: "cycle" }] }, expect: "verified_machine_decoder" },
    { name: "hidden_modular_affine", input: { domain: "hidden_sequence", development: [3, 16, 13, 15, 8, 7, 2, 11], holdout: [5, 9], options: { maxModulus: 20 } }, expect: "verified_hidden_structure" },
    { name: "hidden_competition_unique", input: { domain: "hidden_sequence_competition", development: [3, 16, 13, 15, 8, 7, 2, 11], holdout: [5, 9], stress: [12, 10], options: { maxModulus: 20 } }, expect: "verified_unique_hidden_structure" },
    { name: "hidden_competition_ambiguous", input: { domain: "hidden_sequence_competition", development: [1, 3, 5, 7, 9, 11, 13], holdout: [15, 17], stress: [19, 21], options: { maxModulus: 24 } }, expect: "ambiguous_hidden_structure" },
    { name: "capability_matrix", input: { domain: "capability_matrix", tasks: [{ id: "accept_modular", partition: "calibration", train: [3, 16, 13, 15, 8, 7, 2, 11], test: [5, 9], stress: [12, 10], options: { maxModulus: 20 } }, { id: "accept_ambiguous", partition: "test", train: [1, 3, 5, 7, 9, 11, 13], test: [15, 17], stress: [19, 21], options: { maxModulus: 24 } }] }, expect: "verified_capability_matrix" },
    { name: "identifiability_frontier", input: { domain: "hidden_identifiability", development: [1, 3, 5, 7, 9, 11, 13], holdout: [15, 17], options: { maxModulus: 24, horizon: 16 } }, expect: "ambiguous_within_horizon" },
    { name: "active_observation_design", input: { domain: "active_observation_design", development: [1, 3, 5, 7, 9, 11, 13], holdout: [15, 17], options: { maxModulus: 24, horizon: 8 } }, expect: "active_disambiguation_plan" },
    { name: "noisy_active_observation_design", input: { domain: "noisy_active_observation_design", development: [1, 3, 5, 7, 9, 11, 13], holdout: [15, 17], options: { maxModulus: 24, tolerance: 1, horizon: 8 } }, expect: "noise_robust_disambiguation_plan" },
    { name: "observational_equivalence", input: { domain: "observational_equivalence", development: [1, 3, 5, 7, 9, 11, 13], holdout: [15, 17], options: { maxModulus: 24, horizon: 8 } }, expect: "observationally_distinguishable" },
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
