const fs = require("node:fs");
const path = require("node:path");
const engine = require("./conjecture_engine.js");
const graph = require("./graph_experiment.js");

function main() {
  const arithmetic = Array.from({ length: 20 }, (_, i) => 3 + 4 * i);
  const polynomial = { terms: [{ coefficient: 1, powers: { x: 2 } }, { coefficient: 2, powers: { x: 1, y: 1 } }, { coefficient: 1, powers: { y: 2 } }] };
  const results = {
    sequence: engine.sequenceConjecture(arithmetic),
    graph: engine.graphConjecture(graph.cycle(6)),
    polynomial: engine.polynomialConjecture(polynomial),
  };
  const serializable = JSON.parse(JSON.stringify(results, (key, value) => (typeof value === "function" ? undefined : value)));
  const output = path.join(__dirname, "conjecture_v0_1.json");
  fs.writeFileSync(output, JSON.stringify(serializable, null, 2), "utf8");
  for (const [name, result] of Object.entries(results)) console.log(`${name}: ${result.status}，命题=${result.claim ? Object.values(result.claim)[0] : "—"}`);
  console.log(`已写入 ${output}`);
}

module.exports = { main };
if (require.main === module) main();
