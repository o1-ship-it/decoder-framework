// Independent verification for composed sequence-decoder certificates.

const { createHash } = require("node:crypto");
const sequenceVerifier = require("./decoder_verifier.js");

function difference(values) { return values.slice(1).map((value, index) => value - values[index]); }
function transform(values, order) { let current = values.slice(); for (let i = 0; i < order; i += 1) current = difference(current); return current; }
function reconstruct(train, transformedForecast, order) {
  if (order === 0) return transformedForecast.slice();
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
function integers(values, label) {
  if (!Array.isArray(values) || !values.every(value => /^-?\d+$/.test(String(value)))) throw new TypeError(`${label} 不是整数数组`);
  return values.map(value => BigInt(value));
}

function verifyCertificate(certificate, observed = []) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "composed_sequence_decoder") return { status: "invalid_certificate", reason: "证书声明无效" };
    const development = integers(certificate.development, "development");
    const orderMatch = /^difference\^(\d+)$/.exec(certificate.transform);
    if (!orderMatch) throw new Error("变换链无效");
    const order = Number(orderMatch[1]);
    const transformed = transform(development, order);
    if (JSON.stringify(transformed.map(String)) !== JSON.stringify(certificate.transformedDevelopment)) return { status: "invalid_certificate", reason: "变换结果不一致" };
    const hash = createHash("sha256").update(JSON.stringify(development.map(String))).digest("hex");
    if (hash !== certificate.developmentSha256) return { status: "invalid_certificate", reason: "开发数据哈希不一致" };
    const storedForecast = integers(certificate.forecast, "forecast");
    const transformedForecast = storedForecast.map((_, index) => sequenceVerifier.valueAt(certificate.model.base, transformed.length + index));
    const forecast = reconstruct(development, transformedForecast, order);
    if (forecast.some((value, index) => String(value) !== String(storedForecast[index]))) return { status: "invalid_certificate", reason: "预测无法由变换链重算" };
    const test = integers(observed, "observed");
    const expected = reconstruct(development, Array.from({ length: test.length }, (_, index) => sequenceVerifier.valueAt(certificate.model.base, transformed.length + index)), order);
    for (let index = 0; index < test.length; index += 1) if (test[index] !== expected[index]) return { status: "counterexample_found", term: development.length + index + 1, expected: expected[index], actual: test[index] };
    return { status: "verified_composed_decoder", decoder: certificate.decoder, checkedTerms: test.length };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

module.exports = { verifyCertificate };
