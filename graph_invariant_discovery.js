// Automatic invariant discovery with 1-dimensional Weisfeiler–Leman refinement.
// This is a structural signature, not a complete graph-isomorphism test.

const { normalizeGraph, degrees, connected, canonicalKey } = require("./graph_decoder.js");
const { createHash } = require("node:crypto");

function digest(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

function adjacency(graph) {
  const result = Array.from({ length: graph.n }, () => []);
  for (const [u, v] of graph.edges) { result[u].push(v); result[v].push(u); }
  return result;
}

function colorRefinement(input, maxRounds = 8) {
  const graph = normalizeGraph(input);
  if (!Number.isSafeInteger(maxRounds) || maxRounds < 0 || maxRounds > 32) throw new RangeError("细化轮数必须为 0..32");
  const neighbors = adjacency(graph);
  const ds = degrees(graph);
  let colors = ds.map(degree => digest(["degree", degree]));
  const history = [colors.slice().sort()];
  // Identical neighborhoods receive identical labels across graphs. Local IDs
  // discard their meaning (e.g. every regular graph would be all zeroes).
  const rounds = Math.min(maxRounds, graph.n);
  for (let round = 0; round < rounds; round += 1) {
    colors = colors.map((color, node) => digest([color, neighbors[node].map(next => colors[next]).sort()]));
    history.push(colors.slice().sort());
  }
  return {
    kind: "wl1",
    signatureVersion: 2,
    n: graph.n,
    rounds,
    signature: digest([graph.n, history]),
    degreeHistogram: ds.slice().sort((a, b) => a - b).join("|"),
    connected: connected(graph),
  };
}

function discoverInvariant(input) {
  const graph = normalizeGraph(input);
  const refinement = colorRefinement(graph);
  return {
    representation: "顶点颜色及邻居颜色多重集的迭代细化",
    invariant: refinement,
    canonicalKey: canonicalKey(graph),
  };
}

function compare(a, b) {
  const left = colorRefinement(a);
  const right = colorRefinement(b);
  return {
    sameInvariant: left.signature === right.signature && left.n === right.n,
    isomorphicForSmallGraph: canonicalKey(a) === canonicalKey(b),
    left,
    right,
  };
}

function collisionGroups(graphs) {
  const groups = new Map();
  for (const [name, value] of Object.entries(graphs)) {
    const invariant = colorRefinement(value);
    const key = `${invariant.n}:${invariant.signature}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ name, canonicalKey: canonicalKey(value) });
  }
  return [...groups.values()].filter(group => new Set(group.map(item => item.canonicalKey)).size > 1);
}

module.exports = { colorRefinement, discoverInvariant, compare, collisionGroups };
