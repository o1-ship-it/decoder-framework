// Choose the next observation that most reduces surviving-mechanism ambiguity.
const competition = require("./decoder_hidden_competition.js");
const identifiability = require("./decoder_identifiability.js");

function entropy(groups, total) { return groups.reduce((sum, count) => { const p = count / total; return sum - p * Math.log2(p); }, 0); }

function design(development, holdout, options = {}) {
  const horizon = options.horizon || 16;
  const result = competition.compete(development, holdout, [], options);
  const candidates = result.candidates.filter(row => row.exactHoldout);
  if (candidates.length <= 1) return { decoder: "active_observation_design", status: "already_identified", candidateCount: candidates.length, recommendation: null, frontier: identifiability.distinguish(development, holdout, options) };
  const forecasts = candidates.map(row => ({ family: row.family, values: identifiability.forecast(row, development, holdout.length + horizon).slice(holdout.length) }));
  const frontier = [];
  for (let i = 0; i < horizon; i += 1) {
    const buckets = new Map();
    for (const row of forecasts) { const key = String(row.values[i]); buckets.set(key, (buckets.get(key) || 0) + 1); }
    const counts = [...buckets.values()].sort((a, b) => b - a);
    frontier.push({ additionalObservations: i + 1, predictedValues: [...buckets.keys()].map(Number).sort((a, b) => a - b), groups: counts.length, largestGroup: counts[0], entropyBits: entropy(counts, candidates.length), unresolvedWorstCase: counts[0] });
  }
  const recommendation = frontier.slice().sort((a, b) => a.unresolvedWorstCase - b.unresolvedWorstCase || b.entropyBits - a.entropyBits || a.additionalObservations - b.additionalObservations)[0];
  return { decoder: "active_observation_design", status: "active_disambiguation_plan", candidateCount: candidates.length, recommendation, frontier, limits: ["候选机制与预测范围有限", "均匀候选先验仅用于排序实验，不是概率结论", "观测值本身可能受噪声影响"] };
}

function makeCertificate(development, holdout, options = {}) { return { schemaVersion: 1, claim: "active_observation_design", development, holdout, options, result: design(development, holdout, options) }; }
function verifyCertificate(certificate) { try { if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "active_observation_design") return { status: "invalid_certificate" }; const replay = design(certificate.development, certificate.holdout, certificate.options); return JSON.stringify(replay) === JSON.stringify(certificate.result) ? { status: replay.status } : { status: "invalid_certificate", reason: "主动实验设计无法重放" }; } catch (error) { return { status: "invalid_certificate", reason: error.message }; } }

module.exports = { design, makeCertificate, verifyCertificate };
