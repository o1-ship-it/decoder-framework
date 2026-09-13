// Quantify the first future position where the complete finite candidate bank diverges.
const bank = require("./decoder_candidate_bank.js");
function distinguish(development, holdout, options = {}) {
  const horizon = options.horizon || 16; const observed = development.concat(holdout); const candidates = bank.enumerate(observed, options);
  const predictions = candidates.map(model => ({ id: model.id, family: model.family, parameters: model.parameters, forecast: bank.predict(model, observed, horizon) }));
  let first = null;
  for (let i = 0; i < predictions.length; i += 1) for (let j = i + 1; j < predictions.length; j += 1) { const index = predictions[i].forecast.findIndex((value, k) => value !== predictions[j].forecast[k]); if (index !== -1 && (first === null || index < first.horizon - 1)) first = { horizon: index + 1, absoluteIndex: observed.length + index + 1, left: predictions[i].id, right: predictions[j].id, leftValue: predictions[i].forecast[index], rightValue: predictions[j].forecast[index] }; }
  const status = candidates.length <= 1 ? "identified_hidden_structure" : first ? "ambiguous_within_horizon" : "ambiguous_beyond_horizon";
  return { decoder: "hidden_identifiability_frontier", status, candidateCount: candidates.length, candidates: predictions, firstDistinguishingObservation: first, recommendedAdditionalObservations: first?.horizon ?? null, limits: ["完整候选空间仅限四类显式序列机制", `向前搜索${horizon}个观测`, "候选空间外的机制仍可能存在"] };
}
function makeCertificate(development, holdout, options = {}) { return { schemaVersion: 1, claim: "hidden_identifiability_frontier", development, holdout, options, result: distinguish(development, holdout, options) }; }
function verifyCertificate(certificate) { try { if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "hidden_identifiability_frontier") return { status: "invalid_certificate" }; const replay = distinguish(certificate.development, certificate.holdout, certificate.options); return JSON.stringify(replay) === JSON.stringify(certificate.result) ? { status: replay.status, recommendedAdditionalObservations: replay.recommendedAdditionalObservations } : { status: "invalid_certificate", reason: "可识别性前沿无法重放" }; } catch (error) { return { status: "invalid_certificate", reason: error.message }; } }
module.exports = { distinguish, makeCertificate, verifyCertificate };
