// Bounded decoder synthesis by composing representation transforms and
// transparent sequence decoders.

const base = require("./decoder_benchmark.js");
const { createHash } = require("node:crypto");

function difference(values) { return values.slice(1).map((value, index) => value - values[index]); }
function transform(values, order) {
  let current = values.slice();
  for (let i = 0; i < order; i += 1) current = difference(current);
  return current;
}

function reconstructForecast(train, transformedForecast, order) {
  if (order === 0) return transformedForecast;
  const tails = [];
  let current = train.slice();
  for (let i = 0; i < order; i += 1) { tails.push(current.at(-1)); current = difference(current); }
  let values = transformedForecast.slice();
  for (let level = order - 1; level >= 0; level -= 1) {
    let accumulator = tails[level];
    values = values.map(value => { accumulator += value; return accumulator; });
  }
  return values;
}

function composedDecoder(order, decoder) {
  const name = `${order === 0 ? "identity" : `${order}阶差分`}→${decoder([1, 2, 4, 8, 16, 32], 1).name}`;
  return function decode(train, horizon) {
    const transformed = transform(train, order);
    if (transformed.length < 2) return { name, descriptionLength: Infinity, predicted: [], valid: false, note: "变换后样本不足", model: null };
    const fitted = decoder(transformed, horizon);
    if (!fitted.valid) return { name, descriptionLength: Infinity, predicted: [], valid: false, note: fitted.note, model: null };
    const predicted = reconstructForecast(train, fitted.predicted, order);
    return {
      name,
      descriptionLength: fitted.descriptionLength + order,
      predicted,
      valid: true,
      note: `${order === 0 ? "原表示" : `Δ^${order}表示`}；${fitted.note}`,
      model: { kind: "composed", transform: `difference^${order}`, base: fitted.model, baseDecoder: fitted.name },
    };
  };
}

function candidates(maxOrder = 2) {
  if (!Number.isSafeInteger(maxOrder) || maxOrder < 0 || maxOrder > 3) throw new RangeError("差分阶数必须为 0..3");
  const result = [];
  const families = base.decoders.filter(decoder => decoder.name !== "polynomialDecoder");
  for (let order = 0; order <= maxOrder; order += 1) for (const decoder of families) result.push(composedDecoder(order, decoder));
  return result;
}

function mae(predicted, expected) {
  if (predicted.length !== expected.length || expected.length === 0) return Infinity;
  return predicted.reduce((sum, value, index) => sum + Math.abs(value - expected[index]), 0) / expected.length;
}

function search(sequence, splitSizes = [8, 10, 12], maxOrder = 2) {
  if (!Array.isArray(sequence) || sequence.length < 14 || !sequence.every(Number.isSafeInteger)) throw new TypeError("序列至少需要 14 个安全整数");
  const ranking = candidates(maxOrder).map(decoder => {
    const trials = splitSizes.map(trainSize => {
      const train = sequence.slice(0, trainSize);
      const hidden = sequence.slice(trainSize, trainSize + 2);
      const prediction = decoder(train, hidden.length);
      const error = prediction.valid ? mae(prediction.predicted, hidden) : Infinity;
      return { trainSize, valid: prediction.valid, exact: error === 0, error, note: prediction.note };
    });
    const exactRate = trials.filter(trial => trial.exact).length / trials.length;
    const validTrials = trials.filter(trial => trial.valid);
    const averageError = validTrials.length ? validTrials.reduce((sum, trial) => sum + trial.error, 0) / validTrials.length : Infinity;
    const sample = decoder(sequence.slice(0, splitSizes.at(-1)), 0);
    return { name: sample.name, descriptionLength: sample.descriptionLength, exactRate, averageError, eligible: exactRate === 1, trials, transformOrder: Number(sample.model?.transform?.split("^")[1] || 0), model: sample.model };
  }).sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return (a.descriptionLength + a.averageError * 10) - (b.descriptionLength + b.averageError * 10);
  });
  return ranking;
}

function synthesize(sequence, splitSizes = [8, 10, 12], maxOrder = 2) {
  const ranking = search(sequence, splitSizes, maxOrder);
  const best = ranking[0];
  return { status: best?.eligible ? "candidate_frozen" : "uncertain", best, ranking };
}

function createCertificate(sequence, horizon, splitSizes = [8, 10, 12], maxOrder = 2) {
  if (!Number.isSafeInteger(horizon) || horizon < 1 || horizon > 1000) throw new RangeError("预测长度必须为 1..1000");
  const synthesis = synthesize(sequence, splitSizes, maxOrder);
  if (synthesis.status !== "candidate_frozen") return { status: "uncertain", ranking: synthesis.ranking, certificate: null };
  const fittedDecoder = candidates(maxOrder).find(decoder => decoder(sequence.slice(0, splitSizes.at(-1)), 0).name === synthesis.best.name);
  const fitted = fittedDecoder(sequence, horizon);
  if (!fitted.valid || !fitted.model) return { status: "uncertain", ranking: synthesis.ranking, certificate: null };
  return {
    status: "candidate_frozen",
    ranking: synthesis.ranking,
    certificate: {
      schemaVersion: 1,
      claim: "composed_sequence_decoder",
      decoder: fitted.name,
      transform: fitted.model.transform,
      baseDecoder: fitted.model.baseDecoder,
      model: fitted.model,
      development: sequence.map(String),
      transformedDevelopment: transform(sequence, Number(fitted.model.transform.split("^")[1])).map(String),
      developmentSha256: createHash("sha256").update(JSON.stringify(sequence.map(String))).digest("hex"),
      forecast: fitted.predicted.map(String),
      selection: { splits: splitSizes.slice(), exactRate: synthesis.best.exactRate },
      limits: ["有限整数序列", "变换链来自有限搜索空间", "证书证明有限样本假设，不证明无限序列规律"],
    },
  };
}

module.exports = { difference, transform, reconstructForecast, candidates, search, synthesize, createCertificate };
