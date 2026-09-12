// Search a small family of machine representations and graph decoders.
const graph = require("./graph_decoder.js");
const machine = require("./machine_representation.js");

const decoders = ["cycle", "path", "star", "complete", "regular"];
function predict(decoder, input) { const selected = graph.select(input).candidates.find(candidate => candidate.name === decoder); return selected?.valid ? decoder : "unknown"; }
function representations(input) { const encoded = machine.encodeGraphWL(input); return { graph_wl1: encoded.vector, degree_histogram: [input.n, graph.degrees(graph.normalizeGraph(input)).sort((a, b) => a - b).join("|")] }; }
function search(examples) {
  if (!Array.isArray(examples) || examples.length < 2 || examples.some(example => !example?.graph || typeof example.label !== "string")) throw new TypeError("需要至少两个带标签图样本");
  const candidates = [];
  for (const representation of Object.keys(representations(examples[0].graph))) for (const decoder of decoders) {
    const predictions = examples.map(example => predict(decoder, example.graph));
    const correct = predictions.filter((prediction, index) => prediction === examples[index].label).length;
    candidates.push({ representation, decoder, correct, total: examples.length, accuracy: correct / examples.length, predictions });
  }
  candidates.sort((a, b) => b.accuracy - a.accuracy || a.representation.localeCompare(b.representation) || a.decoder.localeCompare(b.decoder));
  return { winner: candidates[0], candidates };
}
function makeCertificate(examples) { const result = search(examples); return { schemaVersion: 1, claim: "machine_decoder_search", examples, winner: result.winner, candidates: result.candidates, limits: ["有限图解码器候选集", "小型无向图", "准确率只对给定样本负责"] }; }
function verifyCertificate(certificate, holdout) {
  try { if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "machine_decoder_search") return { status: "invalid_certificate" }; const replay = search(certificate.examples); if (replay.winner.decoder !== certificate.winner.decoder || replay.winner.representation !== certificate.winner.representation) return { status: "invalid_certificate", reason: "候选赢家改变" }; const predictions = holdout.map(example => ({ label: example.label, prediction: predict(certificate.winner.decoder, example.graph) })); const correct = predictions.filter(item => item.label === item.prediction).length; return { status: correct === holdout.length ? "verified_machine_decoder" : "counterexample_found", accuracy: holdout.length ? correct / holdout.length : null, predictions }; } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}
module.exports = { representations, predict, search, makeCertificate, verifyCertificate };
