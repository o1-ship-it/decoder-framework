const fs = require("node:fs");
const path = require("node:path");
const graph = require("./graph_decoder.js");
const invariant = require("./graph_invariant_discovery.js");
const base = require("./graph_experiment.js");

function disjointTriangles() {
  return { n: 6, edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3]] };
}

function main() {
  const cycle = base.cycle(6);
  const relabeled = base.relabel(cycle, [2, 5, 1, 4, 0, 3]);
  const triangles = disjointTriangles();
  const graphs = { cycle, relabeledCycle: relabeled, disjointTriangles: triangles, path: base.pathGraph(6), star: base.star(6) };
  const comparisons = {
    relabeling: invariant.compare(cycle, relabeled),
    collision: invariant.compare(cycle, triangles),
  };
  const report = {
    schemaVersion: 1,
    representation: "WL-1 颜色细化",
    discovered: Object.fromEntries(Object.entries(graphs).map(([name, value]) => [name, invariant.discoverInvariant(value)])),
    comparisons,
    collisionGroups: invariant.collisionGroups(graphs),
    limitation: "颜色细化相同只表示当前不变量无法区分，不表示图同构",
  };
  const output = path.join(__dirname, "graph_invariant_v0_1.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2), "utf8");
  console.log(`重新编号保持不变量：${comparisons.relabeling.sameInvariant}`);
  console.log(`环与两个三角形的不变量相同：${comparisons.collision.sameInvariant}`);
  console.log(`但它们的小图规范键相同：${comparisons.collision.isomorphicForSmallGraph}`);
  console.log(`已写入 ${output}`);
}

module.exports = { disjointTriangles, main };
if (require.main === module) main();
