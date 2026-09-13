// Quantify how much additional observation is needed to distinguish
// hidden mechanisms that currently agree with the data.

const competition = require("./decoder_hidden_competition.js");

function validate(values, name, min) {
  if (!Array.isArray(values) || values.length < min || !values.every(Number.isSafeInteger)) throw new TypeError(`${name}必须是至少${min}个安全整数`);
}

function nextFunction(row) {
  if (row.family === "arithmetic") return values => values.at(-1) + row.model.difference;
  if (row.family === "periodic") return values => values.at(-row.model.period);
  if (row.family === "affine") return values => row.model.multiplier * values.at(-1) + row.model.offset;
  if (row.family === "modular_affine") return values => (row.model.multiplier * values.at(-1) + row.model.offset) % row.model.modulus;
  throw new TypeError(`不支持的候选族: ${row.family}`);
}

function forecast(row, development, count) {
  const values = development.slice();
  const next = nextFunction(row);
  for (let i = 0; i < count; i += 1) values.push(next(values));
  return values.slice(development.length);
}

function distinguish(development, holdout, options = {}) {
  validate(development, "开发序列", 6); validate(holdout, "留出序列", 1);
  const horizon = options.horizon || 16;
  if (!Number.isSafeInteger(horizon) || horizon < 1 || horizon > 1000) throw new RangeError("可识别性 horizon 必须是 1..1000");
  const result = competition.compete(development, holdout, [], options);
  const exact = result.candidates.filter(candidate => candidate.exactHoldout);
  const predictions = exact.map(candidate => ({ family: candidate.family, model: candidate.model, forecast: forecast(candidate, development, holdout.length + horizon).slice(holdout.length) }));
  let first = null;
  for (let i = 0; i < predictions.length; i += 1) for (let j = i + 1; j < predictions.length; j += 1) {
    const left = predictions[i]; const right = predictions[j];
    const index = left.forecast.findIndex((value, k) => value !== right.forecast[k]);
    if (index !== -1 && (first === null || index < first.horizon)) first = { horizon: index + 1, absoluteIndex: development.length + holdout.length + index + 1, left: left.family, right: right.family, leftValue: left.forecast[index], rightValue: right.forecast[index] };
  }
  const status = exact.length <= 1 ? "identified_hidden_structure" : first ? "ambiguous_within_horizon" : "ambiguous_beyond_horizon";
  return { decoder: "hidden_identifiability_frontier", status, candidateCount: exact.length, candidates: predictions, firstDistinguishingObservation: first, recommendedAdditionalObservations: first?.horizon ?? null, limits: ["只比较当前显式候选族", `向前搜索${horizon}个观测`, "可识别性结论不排除候选空间外的其他机制"] };
}

function makeCertificate(development, holdout, options = {}) { return { schemaVersion: 1, claim: "hidden_identifiability_frontier", development, holdout, options, result: distinguish(development, holdout, options) }; }
function verifyCertificate(certificate) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "hidden_identifiability_frontier") return { status: "invalid_certificate" };
    const replay = distinguish(certificate.development, certificate.holdout, certificate.options);
    return JSON.stringify(replay) === JSON.stringify(certificate.result) ? { status: replay.status, recommendedAdditionalObservations: replay.recommendedAdditionalObservations } : { status: "invalid_certificate", reason: "可识别性前沿无法重放" };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

module.exports = { distinguish, makeCertificate, verifyCertificate, forecast };
