// Active observation design over the complete finite v2.3 candidate bank.
const bank = require("./decoder_candidate_bank.js");
function groups(values) { return [...new Set(values.map(String))].sort((a, b) => BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0); }
function design(development, holdout, options = {}) {
  const horizon = options.horizon || 16; const observed = development.concat(holdout); const candidates = bank.enumerate(observed, options);
  if (candidates.length <= 1) return { decoder: "active_observation_design", status: candidates.length ? "already_identified" : "uncertain_no_candidate", candidateCount: candidates.length, recommendation: null, frontier: [] };
  const frontier = [];
  for (let step = 1; step <= horizon; step += 1) { const predictions = candidates.map(model => bank.predict(model, observed, step).at(-1)); const values = groups(predictions); const counts = values.map(value => predictions.filter(prediction => prediction === value).length); frontier.push({ additionalObservations: step, predictedValues: values, groups: values.length, largestGroup: Math.max(...counts), entropyBits: counts.reduce((sum, count) => { const p = count / candidates.length; return sum - p * Math.log2(p); }, 0), unresolvedWorstCase: Math.max(...counts) }); }
  const recommendation = frontier.slice().sort((a, b) => a.unresolvedWorstCase - b.unresolvedWorstCase || b.entropyBits - a.entropyBits || a.additionalObservations - b.additionalObservations)[0];
  return { decoder: "active_observation_design", status: "active_disambiguation_plan", candidateCount: candidates.length, recommendation, frontier, limits: ["完整候选空间仅限 arithmetic、periodic、affine、modular_affine", `预测 horizon≤${horizon}`, "均匀候选只用于选择观测，不是概率结论"] };
}
function makeCertificate(development, holdout, options = {}) { return { schemaVersion: 1, claim: "active_observation_design", development, holdout, options, result: design(development, holdout, options) }; }
function verifyCertificate(certificate) { try { if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "active_observation_design") return { status: "invalid_certificate" }; const replay = design(certificate.development, certificate.holdout, certificate.options); return JSON.stringify(replay) === JSON.stringify(certificate.result) ? { status: replay.status } : { status: "invalid_certificate", reason: "主动实验设计无法重放" }; } catch (error) { return { status: "invalid_certificate", reason: error.message }; } }
module.exports = { design, makeCertificate, verifyCertificate };
