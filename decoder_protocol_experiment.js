const fs = require("node:fs");
const path = require("node:path");
const protocol = require("./decoder_protocol.js");
const graphExperiment = require("./graph_experiment.js");

function main() {
  const arithmetic = Array.from({ length: 20 }, (_, i) => 3 + 4 * i);
  const periodic = Array.from({ length: 20 }, (_, i) => [1, 2, 3][i % 3]);
  const cycle = graphExperiment.cycle(6);
  const relabeledCycle = graphExperiment.relabel(cycle, [2, 5, 1, 4, 0, 3]);
  const inputs = {
    sequenceArithmetic: { domain: "sequence", development: arithmetic.slice(0, 16), holdout: arithmetic.slice(16) },
    sequencePeriodic: { domain: "sequence", development: periodic.slice(0, 16), holdout: periodic.slice(16) },
    graphCycle: { domain: "graph", graph: cycle },
    graphRelabeledCycle: { domain: "graph", graph: relabeledCycle },
    equationScaled: { domain: "equation", equation: { terms: { x: 6, y: -3 }, constant: 9 }, equivalentEquation: { terms: { x: 12, y: -6 }, constant: 18 } },
    equationCounterexample: { domain: "equation", equation: { terms: { x: 6, y: -3 }, constant: 9 }, equivalentEquation: { terms: { x: 6, y: -3 }, constant: 10 } },
    equationSystem: { domain: "equation_system", system: { equations: [{ terms: { x: 2, y: 1 }, constant: 5 }, { terms: { x: 1, y: -1 }, constant: 1 }] } },
    generatedSequence: { domain: "generated_sequence", sequence: [1, 2, 4, 7, 12, 20, 33, 54, 88, 143, 232, 376, 609, 986, 1596, 2583, 4180, 6764, 10945, 17710], horizon: 2, observed: [] },
    polynomial: { domain: "polynomial", polynomial: { terms: [{ coefficient: 2, powers: { x: 1, y: 1 } }, { coefficient: 4, powers: { x: 1, y: 1 } }, { coefficient: 3, powers: { y: 2 } }] } },
    polynomialAnalysis: { domain: "polynomial_analysis", polynomial: { terms: [{ coefficient: 1, powers: { x: 2 } }, { coefficient: 2, powers: { x: 1, y: 1 } }, { coefficient: 1, powers: { y: 2 } }] } },
    dynamicsRotation: { domain: "dynamics", map: { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] }, maxDegree: 2, coefficientRange: 1 },
    dynamicsLowSearch: { domain: "dynamics", map: { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] }, maxDegree: 1, coefficientRange: 1 },
  };
  const results = Object.fromEntries(Object.entries(inputs).map(([name, input]) => [name, protocol.decode(input)]));
  const report = { schemaVersion: 1, fields: ["domain", "decoder", "complexity", "residual", "verification"], results };
  const output = path.join(__dirname, "decoder_protocol_v0_1.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2), "utf8");
  for (const [name, result] of Object.entries(results)) console.log(`${name}: ${result.decoder || "不确定"}，残差=${result.residual}, 验证=${result.verification}`);
  console.log(`已写入 ${output}`);
}

module.exports = { main };
if (require.main === module) main();
