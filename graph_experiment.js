const fs = require("node:fs");
const pathModule = require("node:path");
const graph = require("./graph_decoder.js");

function edgeGraph(n, edges) { return { n, edges }; }
function cycle(n) { return edgeGraph(n, Array.from({ length: n }, (_, i) => [i, (i + 1) % n])); }
function pathGraph(n) { return edgeGraph(n, Array.from({ length: n - 1 }, (_, i) => [i, i + 1])); }
function star(n) { return edgeGraph(n, Array.from({ length: n - 1 }, (_, i) => [0, i + 1])); }
function relabel(input, labels) { return edgeGraph(input.n, input.edges.map(([u, v]) => [labels[u], labels[v]])); }

function main() {
  const source = cycle(6);
  const relabeled = relabel(source, [2, 5, 1, 4, 0, 3]);
  const pathValue = pathGraph(6);
  const starGraph = star(6);
  const counterexample = edgeGraph(6, [...source.edges, [0, 3]]);
  const cases = { cycle: source, relabeledCycle: relabeled, path: pathValue, star: starGraph, cycleWithChord: counterexample };
  const sourceCertificate = graph.makeCertificate(source);
  const rows = Object.entries(cases).map(([name, value]) => {
    const selected = graph.select(value);
    const verification = graph.verifyCertificate(sourceCertificate.certificate, value);
    return { name, winner: selected.winner?.name || null, validCandidates: selected.candidates.filter(item => item.valid).map(item => item.name), verification };
  });
  const report = { schemaVersion: 1, sourceCertificate, rows, relabelingHashEqual: graph.graphHash(source) === graph.graphHash(relabeled) };
  const output = pathModule.join(__dirname, "graph_decoder_v0_1.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2), "utf8");
  for (const row of rows) console.log(`${row.name}: ${row.winner || "不确定"}，环证书=${row.verification.status}`);
  console.log(`标签置换后规范哈希相同：${report.relabelingHashEqual}`);
  console.log(`已写入 ${output}`);
}

module.exports = { cycle, pathGraph, star, relabel, main };
if (require.main === module) main();
