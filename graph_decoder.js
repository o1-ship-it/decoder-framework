// Small-graph decoder: labels are treated as a representation choice;
// structural claims are checked through graph invariants.

const { createHash } = require("node:crypto");

function normalizeGraph(graph) {
  if (!graph || !Number.isSafeInteger(graph.n) || graph.n < 1 || !Array.isArray(graph.edges)) throw new TypeError("图格式无效");
  const seen = new Set();
  const edges = graph.edges.map((edge, i) => {
    if (!Array.isArray(edge) || edge.length !== 2) throw new TypeError(`边 ${i} 格式无效`);
    const [u, v] = edge;
    if (!Number.isSafeInteger(u) || !Number.isSafeInteger(v) || u < 0 || v < 0 || u >= graph.n || v >= graph.n || u === v) throw new RangeError(`边 ${i} 的顶点无效`);
    const normalized = u < v ? [u, v] : [v, u];
    const key = normalized.join(",");
    if (seen.has(key)) throw new Error(`重复边: ${key}`);
    seen.add(key);
    return normalized;
  }).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { n: graph.n, edges };
}

function degrees(graph) {
  const values = Array(graph.n).fill(0);
  for (const [u, v] of graph.edges) { values[u] += 1; values[v] += 1; }
  return values;
}

function connected(graph) {
  if (graph.n === 0) return false;
  const adjacency = Array.from({ length: graph.n }, () => []);
  for (const [u, v] of graph.edges) { adjacency[u].push(v); adjacency[v].push(u); }
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) for (const next of adjacency[queue.shift()]) if (!seen.has(next)) { seen.add(next); queue.push(next); }
  return seen.size === graph.n;
}

function candidate(name, descriptionLength, valid, note, model) {
  return { name, descriptionLength, valid, note, model };
}

function cycleDecoder(input) {
  const graph = normalizeGraph(input);
  const ds = degrees(graph);
  const valid = graph.n >= 3 && graph.edges.length === graph.n && connected(graph) && ds.every(d => d === 2);
  return candidate("cycle", 2, valid, valid ? `C${graph.n}` : "边数、连通性或度数不符", { kind: "cycle", n: graph.n });
}

function pathDecoder(input) {
  const graph = normalizeGraph(input);
  const ds = degrees(graph).sort((a, b) => a - b);
  const valid = graph.n >= 2 && graph.edges.length === graph.n - 1 && connected(graph) && ds[0] === 1 && ds[1] === 1 && ds.slice(2).every(d => d === 2);
  return candidate("path", 3, valid, valid ? `P${graph.n}` : "边数、连通性或度数不符", { kind: "path", n: graph.n });
}

function starDecoder(input) {
  const graph = normalizeGraph(input);
  const ds = degrees(graph).sort((a, b) => a - b);
  const valid = graph.n >= 3 && graph.edges.length === graph.n - 1 && connected(graph) && ds[ds.length - 1] === graph.n - 1 && ds.slice(0, -1).every(d => d === 1);
  return candidate("star", 3, valid, valid ? `S${graph.n - 1}` : "中心度数或连通性不符", { kind: "star", n: graph.n });
}

function completeDecoder(input) {
  const graph = normalizeGraph(input);
  const valid = graph.edges.length === graph.n * (graph.n - 1) / 2 && degrees(graph).every(d => d === graph.n - 1);
  return candidate("complete", 2, valid, valid ? `K${graph.n}` : "边数或度数不符", { kind: "complete", n: graph.n });
}

function regularDecoder(input) {
  const graph = normalizeGraph(input);
  const ds = degrees(graph);
  const valid = ds.every(d => d === ds[0]);
  return candidate("regular", 3, valid, valid ? `${ds[0]}-正则图` : "度数不恒定", { kind: "regular", n: graph.n, degree: ds[0] });
}

function rawDecoder(input) {
  const graph = normalizeGraph(input);
  return candidate("raw_edges", graph.edges.length + 2, true, `${graph.n} 个顶点，${graph.edges.length} 条边`, { kind: "raw_edges", n: graph.n, edges: graph.edges });
}

const decoders = [cycleDecoder, pathDecoder, starDecoder, completeDecoder, regularDecoder, rawDecoder];

function select(graph) {
  const candidates = decoders.map(decoder => decoder(graph));
  const structural = candidates.filter(item => item.valid).sort((a, b) => a.descriptionLength - b.descriptionLength);
  return { winner: structural[0] || null, candidates };
}

function canonicalKey(graph) {
  const normalized = normalizeGraph(graph);
  if (normalized.n > 8) throw new RangeError("当前规范化验证器只接受不超过 8 个顶点的图");
  const edges = normalized.edges;
  let best = null;
  const permutation = [];
  const used = new Set();
  function visit() {
    if (permutation.length === normalized.n) {
      const mapped = edges.map(([u, v]) => {
        const a = permutation[u];
        const b = permutation[v];
        return a < b ? [a, b] : [b, a];
      }).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const key = JSON.stringify(mapped);
      if (best === null || key < best) best = key;
      return;
    }
    for (let label = 0; label < normalized.n; label += 1) if (!used.has(label)) {
      used.add(label); permutation.push(label); visit(); permutation.pop(); used.delete(label);
    }
  }
  visit();
  return JSON.stringify({ n: normalized.n, edges: best });
}

function graphHash(graph) {
  return createHash("sha256").update(canonicalKey(graph)).digest("hex");
}

function verifyModel(model, graph) {
  try {
    const normalized = normalizeGraph(graph);
    const ds = degrees(normalized);
    if (model.kind === "cycle") return normalized.n === model.n && normalized.edges.length === model.n && connected(normalized) && ds.every(d => d === 2);
    if (model.kind === "path") return normalized.n === model.n && normalized.edges.length === model.n - 1 && connected(normalized) && ds.filter(d => d === 1).length === 2 && ds.filter(d => d === 2).length === model.n - 2;
    if (model.kind === "star") return normalized.n === model.n && normalized.edges.length === model.n - 1 && connected(normalized) && ds.includes(model.n - 1) && ds.filter(d => d === 1).length === model.n - 1;
    if (model.kind === "complete") return normalized.n === model.n && normalized.edges.length === model.n * (model.n - 1) / 2 && ds.every(d => d === model.n - 1);
    if (model.kind === "regular") return normalized.n === model.n && ds.every(d => d === model.degree);
    if (model.kind === "raw_edges") return normalized.n === model.n && JSON.stringify(normalized.edges) === JSON.stringify(model.edges);
    return false;
  } catch { return false; }
}

function makeCertificate(graph) {
  const normalized = normalizeGraph(graph);
  const selection = select(normalized);
  if (!selection.winner) return { status: "uncertain", candidates: selection.candidates };
  return {
    status: "candidate_frozen",
    certificate: {
      schemaVersion: 1,
      claim: "finite_graph_invariant",
      graphHash: graphHash(normalized),
      n: normalized.n,
      model: selection.winner.model,
      rule: selection.winner.note,
      complexity: selection.winner.descriptionLength,
      candidateNames: selection.candidates.filter(item => item.valid).map(item => item.name),
      limits: ["简单无向图", "标签不承载结构意义", "有限图不变量检查，不等价于完整图同构证明"],
    },
  };
}

function verifyCertificate(certificate, graph) {
  try {
    const normalized = normalizeGraph(graph);
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "finite_graph_invariant") return { status: "invalid_certificate", reason: "证书声明无效" };
    if (certificate.graphHash !== graphHash(normalized)) return { status: "counterexample_found", reason: "图哈希改变，输入表示不一致" };
    if (!verifyModel(certificate.model, normalized)) return { status: "counterexample_found", reason: "图不满足证书中的不变量", model: certificate.model.kind };
    return { status: "verified_on_graph", invariant: certificate.model.kind, n: normalized.n };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

module.exports = { normalizeGraph, degrees, connected, decoders, select, canonicalKey, graphHash, verifyModel, makeCertificate, verifyCertificate };
