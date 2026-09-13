// Compete a small, explicit family of sequence decoders.
// A verified result requires an exact holdout and a unique surviving family.

const hidden = require("./decoder_hidden_structure.js");

function validateSequence(values, name, minLength = 1) {
  if (!Array.isArray(values) || values.length < minLength || !values.every(Number.isSafeInteger)) {
    throw new TypeError(`${name}需要至少${minLength}个安全整数`);
  }
}

function maxAbs(errors) { return errors.length ? Math.max(...errors.map(Math.abs)) : null; }

function scoreCandidate(name, model, development, holdout, stress = []) {
  const forecast = count => {
    const values = development.slice();
    for (let i = 0; i < count; i += 1) values.push(model.next(values));
    return values.slice(development.length);
  };
  const holdoutForecast = forecast(holdout.length);
  const stressForecast = forecast(stress.length);
  const holdoutResidualMax = maxAbs(holdout.map((value, i) => value - holdoutForecast[i]));
  const stressResidualMax = maxAbs(stress.map((value, i) => value - stressForecast[i]));
  const fitsDevelopment = model.fits;
  return {
    family: name,
    model: model.description,
    complexity: model.complexity,
    fitsDevelopment,
    holdoutForecast,
    holdoutResidualMax,
    stressForecast,
    stressResidualMax,
    exactHoldout: fitsDevelopment && holdoutResidualMax === 0,
  };
}

function arithmeticCandidate(development) {
  const difference = development[1] - development[0];
  const fits = development.every((value, i) => i < 2 || value === development[i - 1] + difference);
  return { fits, complexity: 1, description: { difference }, next: values => values.at(-1) + difference };
}

function periodicCandidates(development, maxPeriod) {
  const candidates = [];
  for (let period = 1; period <= Math.min(maxPeriod, Math.floor(development.length / 2)); period += 1) {
    const fits = development.every((value, i) => i < period || value === development[i - period]);
    if (fits) candidates.push({ fits, complexity: period, description: { period }, next: values => values.at(-period) });
  }
  return candidates;
}

function affineCandidates(development, coefficientRange) {
  const candidates = [];
  for (let a = -coefficientRange; a <= coefficientRange; a += 1) for (let b = -coefficientRange; b <= coefficientRange; b += 1) {
    const fits = development.every((value, i) => i === 0 || value === a * development[i - 1] + b);
    if (fits) candidates.push({ fits, complexity: Math.abs(a) + Math.abs(b) + 2, description: { multiplier: a, offset: b }, next: values => a * values.at(-1) + b });
  }
  return candidates;
}

function compete(development, holdout = [], stress = [], options = {}) {
  validateSequence(development, "开发序列", 6);
  validateSequence(holdout, "留出序列", 1);
  if (!Array.isArray(stress) || !stress.every(Number.isSafeInteger)) throw new TypeError("stress序列必须是安全整数数组");
  const maxPeriod = options.maxPeriod || 4;
  const coefficientRange = options.coefficientRange || 8;
  const rows = [];
  rows.push(scoreCandidate("arithmetic", arithmeticCandidate(development), development, holdout, stress));
  for (const candidate of periodicCandidates(development, maxPeriod)) rows.push(scoreCandidate("periodic", candidate, development, holdout, stress));
  for (const candidate of affineCandidates(development, coefficientRange)) rows.push(scoreCandidate("affine", candidate, development, holdout, stress));
  const modular = hidden.discover(development, holdout, options);
  if (modular.winner) {
    const stressForecast = [];
    let current = development.at(-1);
    for (let i = 0; i < stress.length; i += 1) { current = (modular.winner.multiplier * current + modular.winner.offset) % modular.winner.modulus; stressForecast.push(current); }
    rows.push({ family: "modular_affine", model: modular.winner, complexity: 3, fitsDevelopment: true, holdoutForecast: modular.winner.forecast, holdoutResidualMax: modular.winner.holdoutResidualMax, stressForecast, stressResidualMax: maxAbs(stress.map((value, i) => value - stressForecast[i])), exactHoldout: modular.winner.holdoutResidualMax === 0, candidateCount: modular.candidateCount });
  }
  const exact = rows.filter(row => row.exactHoldout);
  const minComplexity = exact.length ? Math.min(...exact.map(row => row.complexity)) : null;
  const winners = exact.filter(row => row.complexity === minComplexity);
  // Simplicity ranks candidates, but does not erase observational ambiguity.
  const status = exact.length === 1 ? "verified_unique_hidden_structure" : exact.length > 1 ? "ambiguous_hidden_structure" : "uncertain_hidden_structure";
  return { decoder: "hidden_structure_competition", status, residual: status === "verified_unique_hidden_structure" ? 0 : null, candidates: rows.sort((a, b) => (a.holdoutResidualMax ?? Infinity) - (b.holdoutResidualMax ?? Infinity) || a.complexity - b.complexity), winners, exactCandidateCount: exact.length, limits: [`周期${maxPeriod}以内`, `仿射系数±${coefficientRange}`, "模数范围由 options 控制", "有限候选族与有限留出数据不构成唯一生成定理"] };
}

function makeCertificate(development, holdout, stress = [], options = {}) {
  return { schemaVersion: 1, claim: "hidden_structure_competition", development, holdout, stress, options, result: compete(development, holdout, stress, options) };
}

function verifyCertificate(certificate) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "hidden_structure_competition") return { status: "invalid_certificate" };
    const replay = compete(certificate.development, certificate.holdout, certificate.stress, certificate.options);
    if (JSON.stringify(replay) !== JSON.stringify(certificate.result)) return { status: "invalid_certificate", reason: "候选竞争结果无法重放" };
    return { status: replay.status, residual: replay.residual, exactCandidateCount: replay.exactCandidateCount };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

module.exports = { compete, makeCertificate, verifyCertificate };
