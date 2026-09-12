const fs = require("node:fs");
const path = require("node:path");
const dynamics = require("./dynamics_invariant.js");
const condition = require("./dynamics_condition_inference.js");
const general = require("./dynamics_condition_general.js");

function rotationScaling({ a, b }) { return { x: [{ coefficient: a, powers: [1, 0] }, { coefficient: -b, powers: [0, 1] }], y: [{ coefficient: b, powers: [1, 0] }, { coefficient: a, powers: [0, 1] }] }; }
function main() {
  const invariant = dynamics.discoverLinear(rotationScaling({ a: 0, b: 1 }), 2).invariants[0];
  const rotationSamples = [{ a: 0, b: 1 }, { a: 1, b: 0 }, { a: 0, b: -1 }, { a: -1, b: 0 }, { a: 1, b: 1 }, { a: 2, b: 0 }, { a: 2, b: 1 }];
  const inferred = condition.inferCondition(rotationScaling, invariant, rotationSamples);
  function perturbed({ a, b }) { const p = a * (a - 1) * (a + 1); return { x: [{ coefficient: 1 + p, powers: [1, 0] }], y: [{ coefficient: 1, powers: [0, 1] }] }; }
  const adversarialInvariant = dynamics.discoverLinear(perturbed({ a: 0, b: 0 }), 2).invariants.find(item => item.rule === "1x^2y^0");
  const adversarial = condition.inferCondition(perturbed, adversarialInvariant, [{ a: -2, b: 0 }, { a: -1, b: 1 }, { a: 0, b: 4 }, { a: 1, b: 2 }, { a: 2, b: 7 }, { a: 3, b: -3 }, { a: 4, b: 0 }]);
  const output = { schemaVersion: 1, claim: "parameter_condition_experiment", cases: { rotation: inferred, adversarial }, conclusion: { rotationGeneralizes: inferred.generalizes, adversarialRejected: !adversarial.generalizes } };
  const file = path.join(__dirname, "dynamics_condition_v0_1.json"); fs.writeFileSync(file, JSON.stringify(output, null, 2), "utf8"); console.log(`参数条件实验：正常=${inferred.status}，压力测试=${adversarial.status}`); console.log(`已写入 ${file}`); return output;
}

if (require.main === module) main();
module.exports = { main };
