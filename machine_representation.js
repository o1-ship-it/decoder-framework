// Machine-native representation with optional human translation.
const crypto = require("node:crypto");
const graphInvariant = require("./graph_invariant_discovery.js");

function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function encodeGraphWL(graph) {
  const invariant = graphInvariant.colorRefinement(graph);
  const vector = [invariant.n, invariant.rounds, invariant.degreeHistogram, invariant.signature, Number(invariant.connected)];
  return { kind: "graph_wl1", vector, digest: digest(vector), translation: { vertices: invariant.n, degreeHistogram: invariant.degreeHistogram, connected: invariant.connected } };
}
function makeCertificate(graph) { const representation = encodeGraphWL(graph); return { schemaVersion: 1, claim: "machine_native_representation", input: graph, representation }; }
function verifyCertificate(certificate, graph) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "machine_native_representation") return { status: "invalid_certificate", reason: "证书声明无效" };
    const actual = encodeGraphWL(graph);
    if (actual.digest !== certificate.representation.digest || JSON.stringify(actual.vector) !== JSON.stringify(certificate.representation.vector)) return { status: "counterexample_found", reason: "机器表示改变" };
    if (JSON.stringify(actual.translation) !== JSON.stringify(certificate.representation.translation)) return { status: "invalid_certificate", reason: "人类翻译与机器表示不一致" };
    return { status: "verified_machine_representation", digest: actual.digest, translation: actual.translation };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}
module.exports = { digest, encodeGraphWL, makeCertificate, verifyCertificate };
