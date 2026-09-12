// Independent certificate verifier. It deliberately does not import any fitter.

const { createHash } = require("node:crypto");

function integer(value, label) {
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
  throw new TypeError(`${label} 不是规范整数`);
}

function canonicalArray(values, label) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError(`${label} 必须是非空数组`);
  return values.map((value, i) => integer(value, `${label}[${i}]`));
}

function choose(n, k) {
  if (k < 0 || k > n) return 0n;
  let value = 1n;
  for (let i = 1; i <= k; i += 1) value = value * BigInt(n - i + 1) / BigInt(i);
  return value;
}

function valueAt(model, index) {
  if (!model || typeof model.kind !== "string") throw new TypeError("缺少模型类型");
  if (!Number.isSafeInteger(index) || index < 0) throw new RangeError("模型索引无效");
  if (model.kind === "constant") return integer(model.value, "constant.value");
  if (model.kind === "arithmetic") return integer(model.start, "arithmetic.start") + integer(model.difference, "arithmetic.difference") * BigInt(index);
  if (model.kind === "periodic") {
    const pattern = canonicalArray(model.pattern, "periodic.pattern");
    return pattern[index % pattern.length];
  }
  if (model.kind === "finite_differences") {
    const coefficients = canonicalArray(model.coefficients, "finite_differences.coefficients");
    return coefficients.reduce((sum, coefficient, k) => sum + coefficient * choose(index, k), 0n);
  }
  if (model.kind === "linear_recurrence") {
    const coefficients = canonicalArray(model.coefficients, "linear_recurrence.coefficients");
    const initial = canonicalArray(model.initial, "linear_recurrence.initial");
    if (coefficients.length !== 2 || initial.length !== 2) throw new TypeError("二阶递推参数无效");
    if (index < 2) return initial[index];
    const values = initial.slice();
    for (let i = 2; i <= index; i += 1) values.push(coefficients[0] * values[i - 1] + coefficients[1] * values[i - 2]);
    return values[index];
  }
  if (model.kind === "difference_recurrence") {
    const coefficients = canonicalArray(model.coefficients, "difference_recurrence.coefficients");
    const initial = canonicalArray(model.initial, "difference_recurrence.initial");
    if (coefficients.length !== 2 || initial.length !== 3) throw new TypeError("差分递推参数无效");
    if (index < 3) return initial[index];
    let x0 = initial[0];
    let x1 = initial[1];
    let x2 = initial[2];
    let d0 = x1 - x0;
    let d1 = x2 - x1;
    for (let i = 3; i <= index; i += 1) {
      const nextDifference = coefficients[0] * d1 + coefficients[1] * d0;
      const next = x2 + nextDifference;
      x0 = x1; x1 = x2; x2 = next;
      d0 = d1; d1 = nextDifference;
    }
    return x2;
  }
  throw new TypeError(`未知模型类型: ${model.kind}`);
}

function firstMismatch(actual, expected) {
  const length = Math.max(actual.length, expected.length);
  for (let i = 0; i < length; i += 1) {
    if (actual[i] !== expected[i]) return { term: i + 1, actual: actual[i] ?? null, expected: expected[i] ?? null };
  }
  return null;
}

function verifyCertificate(certificate, development, observed = []) {
  try {
    if (!certificate || certificate.schemaVersion !== 2 || certificate.claim !== "finite_sample_hypothesis") throw new TypeError("证书版本或声明不受支持");
    const dev = canonicalArray(development, "development");
    if (dev.length !== certificate.developmentLength) throw new Error("开发数据长度与证书不一致");
    const hash = createHash("sha256").update(JSON.stringify(dev.map(String))).digest("hex");
    if (hash !== certificate.developmentSha256) throw new Error("开发数据哈希不一致");
    const fitted = Array.from({ length: dev.length }, (_, i) => valueAt(certificate.model, i));
    const fitMismatch = firstMismatch(dev.map(String), fitted.map(String));
    if (fitMismatch) return { status: "invalid_certificate", reason: "模型无法重现开发数据", mismatch: fitMismatch };
    const storedForecast = canonicalArray(certificate.forecast, "forecast");
    const forecast = Array.from({ length: storedForecast.length }, (_, i) => valueAt(certificate.model, dev.length + i));
    const forecastMismatch = firstMismatch(storedForecast.map(String), forecast.map(String));
    if (forecastMismatch) return { status: "invalid_certificate", reason: "证书预测与模型不一致", mismatch: forecastMismatch };
    const test = observed.length ? canonicalArray(observed, "observed") : [];
    const expectedTest = test.map((_, i) => valueAt(certificate.model, dev.length + i));
    const counterexample = firstMismatch(test.map(String), expectedTest.map(String));
    if (counterexample) return { status: "counterexample_found", counterexample: { ...counterexample, globalTerm: dev.length + counterexample.term }, checkedTerms: test.length };
    return { status: "verified_on_supplied_observations", checkedTerms: test.length, developmentTerms: dev.length, forecastTerms: storedForecast.length };
  } catch (error) {
    return { status: "invalid_certificate", reason: error.message };
  }
}

module.exports = { valueAt, verifyCertificate };
