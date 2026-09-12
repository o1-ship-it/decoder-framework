const fs = require("node:fs");
const path = require("node:path");
const dynamics = require("./dynamics_invariant.js");

function main() {
  const systems = {
    rotation: { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] },
    shear: { x: [{ coefficient: 1, powers: [1, 0] }, { coefficient: 1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [0, 1] }] },
    expanding: { x: [{ coefficient: 2, powers: [1, 0] }], y: [{ coefficient: 3, powers: [0, 1] }] },
  };
  const report = Object.fromEntries(Object.entries(systems).map(([name, map]) => {
    const result = dynamics.discover(map, 2, 1);
    return [name, { map, invariantCount: result.invariants.length, invariants: result.invariants.slice(0, 5).map(item => item.rule), allVerified: result.invariants.every(item => dynamics.verifyInvariant(item, map)) }];
  }));
  const output = path.join(__dirname, "dynamics_invariant_v0_1.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2), "utf8");
  for (const [name, value] of Object.entries(report)) console.log(`${name}: ${value.invariantCount} 个候选，全部验证=${value.allVerified}`);
  console.log(`已写入 ${output}`);
}

module.exports = { main };
if (require.main === module) main();
