// Conservative active design with bounded measurement noise.
const bank = require("./decoder_candidate_bank.js");
function maxOverlap(predictions, tolerance) { const sorted = predictions.map(BigInt).sort((a, b) => a < b ? -1 : a > b ? 1 : 0); const width = 2n * BigInt(tolerance); let max = 0; for (let left = 0, right = 0; left < sorted.length; left += 1) { while (right < sorted.length && sorted[right] - sorted[left] <= width) right += 1; max = Math.max(max, right - left); } return max; }
function design(development, holdout, options = {}) {
  const tolerance = options.tolerance ?? 1; const horizon = options.horizon || 16; if (!Number.isSafeInteger(tolerance) || tolerance < 0) throw new TypeError("噪声容差必须是非负安全整数");
  const observed = development.concat(holdout); const candidates = bank.enumerate(observed, options);
  if (candidates.length <= 1) return { decoder: "noisy_active_observation_design", status: candidates.length ? "already_identified" : "uncertain_no_candidate", tolerance, candidateCount: candidates.length, recommendation: null, frontier: [] };
  const frontier = [];
  for (let step = 1; step <= horizon; step += 1) { const predictions = candidates.map(model => bank.predict(model, observed, step).at(-1)); const overlap = maxOverlap(predictions, tolerance); frontier.push({ additionalObservations: step, candidateCount: candidates.length, predictedValues: [...new Set(predictions)].sort((a, b) => BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0), worstCaseIntervalOverlap: overlap, guaranteedEliminations: candidates.length - overlap }); }
  const recommendation = frontier.slice().sort((a, b) => a.worstCaseIntervalOverlap - b.worstCaseIntervalOverlap || a.additionalObservations - b.additionalObservations)[0];
  return { decoder: "noisy_active_observation_design", status: "noise_robust_disambiguation_plan", tolerance, candidateCount: candidates.length, recommendation, frontier, limits: ["候选由完整有限版本空间枚举", `有界加性噪声≤${tolerance}`, "区间重叠是保守的最坏情况判据"] };
}
function makeCertificate(development, holdout, options = {}) { return { schemaVersion: 1, claim: "noisy_active_observation_design", development, holdout, options, result: design(development, holdout, options) }; }
function verifyCertificate(certificate) { try { if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "noisy_active_observation_design") return { status: "invalid_certificate" }; const replay = design(certificate.development, certificate.holdout, certificate.options); return JSON.stringify(replay) === JSON.stringify(certificate.result) ? { status: replay.status } : { status: "invalid_certificate", reason: "噪声主动设计无法重放" }; } catch (error) { return { status: "invalid_certificate", reason: error.message }; } }
module.exports = { design, makeCertificate, verifyCertificate };
