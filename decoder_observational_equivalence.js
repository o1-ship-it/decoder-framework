// Quotient a finite mechanism version space by observational predictions.
// Different parameterizations that make the same future predictions are
// one predictive class, even though their internal mechanisms differ.
const bank = require("./decoder_candidate_bank.js");

function classes(candidates, observed, horizon) {
  const groups = new Map();
  for (const candidate of candidates) {
    const forecast = bank.predict(candidate, observed, horizon);
    const key = forecast.join(",");
    if (!groups.has(key)) groups.set(key, { forecast, members: [] });
    groups.get(key).members.push({ id: candidate.id, family: candidate.family, parameters: candidate.parameters });
  }
  return [...groups.values()].map((group, index) => ({ classId: index, forecast: group.forecast, memberCount: group.members.length, members: group.members }));
}

function analyze(development, holdout, options = {}) {
  const horizon = options.horizon || 32;
  if (!Number.isSafeInteger(horizon) || horizon < 1 || horizon > 1000) throw new RangeError("等价分析 horizon 必须是 1..1000");
  const observed = development.concat(holdout);
  const candidates = bank.enumerate(observed, options);
  if (candidates.length === 0) return { decoder: "observational_equivalence", status: "uncertain_no_candidate", mechanismCount: 0, predictiveClassCount: 0, classes: [], firstDistinguishingHorizon: null, fullIdentificationHorizon: null, limits: ["有限候选空间", `预测 horizon≤${horizon}`] };
  let firstDistinguishingHorizon = null; let fullIdentificationHorizon = null;
  for (let step = 1; step <= horizon; step += 1) {
    const current = classes(candidates, observed, step);
    if (current.length > 1 && firstDistinguishingHorizon === null) firstDistinguishingHorizon = step;
    if (current.length === candidates.length) { fullIdentificationHorizon = step; break; }
  }
  const finalClasses = classes(candidates, observed, horizon);
  const status = candidates.length === 1 ? "identified_hidden_structure" : finalClasses.length === 1 ? "observationally_equivalent_within_horizon" : "observationally_distinguishable";
  return { decoder: "observational_equivalence", status, mechanismCount: candidates.length, predictiveClassCount: finalClasses.length, compressionRatio: finalClasses.length / candidates.length, firstDistinguishingHorizon, fullIdentificationHorizon, classes: finalClasses, limits: ["机制候选由 arithmetic、periodic、affine、modular_affine 枚举", `预测 horizon≤${horizon}`, "同一预测类中的机制在该 horizon 内不可由观测区分"] };
}

function makeCertificate(development, holdout, options = {}) { return { schemaVersion: 1, claim: "observational_equivalence", development, holdout, options, result: analyze(development, holdout, options) }; }
function verifyCertificate(certificate) { try { if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "observational_equivalence") return { status: "invalid_certificate" }; const replay = analyze(certificate.development, certificate.holdout, certificate.options); return JSON.stringify(replay) === JSON.stringify(certificate.result) ? { status: replay.status, predictiveClassCount: replay.predictiveClassCount } : { status: "invalid_certificate", reason: "观测等价类无法重放" }; } catch (error) { return { status: "invalid_certificate", reason: error.message }; } }

module.exports = { classes, analyze, makeCertificate, verifyCertificate };
