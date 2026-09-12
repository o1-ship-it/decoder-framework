// Infer a low-degree polynomial condition from sampled invariant residuals.
// The current bounded model uses two parameters (a,b) and degree <= 2.

const dynamics = require("./dynamics_invariant.js");

const features = (a, b) => [1, a, b, a * a, a * b, b * b];
const labels = ["1", "a", "b", "a^2", "ab", "b^2"];

function solveSquare(matrix, values) {
  const n = values.length; const aug = matrix.map((row, i) => row.map(Number).concat(values[i]));
  for (let column = 0; column < n; column += 1) {
    let pivot = column; for (let row = column + 1; row < n; row += 1) if (Math.abs(aug[row][column]) > Math.abs(aug[pivot][column])) pivot = row;
    if (Math.abs(aug[pivot][column]) < 1e-9) throw new Error("参数样本不足以确定条件");
    [aug[column], aug[pivot]] = [aug[pivot], aug[column]];
    const scale = aug[column][column]; for (let j = column; j <= n; j += 1) aug[column][j] /= scale;
    for (let row = 0; row < n; row += 1) if (row !== column) { const factor = aug[row][column]; for (let j = column; j <= n; j += 1) aug[row][j] -= factor * aug[column][j]; }
  }
  return aug.map(row => Math.abs(row[n]) < 1e-8 ? 0 : Math.round(row[n]));
}

function inferCondition(family, invariant, samples, point = [1, 0], fitCount = 6) {
  if (typeof family !== "function" || !invariant?.polynomial || !Array.isArray(samples) || !Number.isSafeInteger(fitCount) || fitCount < 6 || samples.length <= fitCount) throw new TypeError("需要参数族、不变量和拟合集外的参数留出样本");
  const points = Array.isArray(point[0]) ? point : [point];
  const primaryPoint = points[0];
  const rows = samples.slice(0, fitCount).map(({ a, b }) => features(a, b));
  if (fitCount !== 6) throw new TypeError("当前二参数二次条件需要恰好 6 个拟合样本");
  const residualAt = ({ a, b }, state) => { const map = family({ a, b }); const image = [dynamics.evaluate(map.x, state[0], state[1]), dynamics.evaluate(map.y, state[0], state[1])]; return dynamics.evaluate(invariant.polynomial, image[0], image[1]) - dynamics.evaluate(invariant.polynomial, state[0], state[1]); };
  const residuals = samples.slice(0, fitCount).map(sample => residualAt(sample, primaryPoint));
  const coefficients = solveSquare(rows, residuals);
  const expression = coefficients.map((coefficient, index) => {
    if (!coefficient) return null;
    const label = labels[index];
    if (coefficient === 1) return label === "1" ? "1" : label;
    if (coefficient === -1) return label === "1" ? "-1" : `-${label}`;
    return `${coefficient}${label === "1" ? "" : ` ${label}`}`;
  }).filter(Boolean).join(" + ").replace(/\+ -/g, "- ") || "0";
  const checks = samples.map(({ a, b }) => { const predicted = features(a, b).reduce((sum, value, index) => sum + coefficients[index] * value, 0); const actual = residualAt({ a, b }, primaryPoint); return { parameters: { a, b }, predicted, actual, residual: actual - predicted }; });
  const stateChecks = points.flatMap(state => samples.map(sample => ({ state, parameters: sample, residual: residualAt(sample, state) })));
  const fitChecks = checks.slice(0, fitCount); const holdoutChecks = checks.slice(fitCount);
  const zeroConditionSamples = checks.filter(check => check.predicted === 0).map(check => JSON.stringify(check.parameters));
  const generalizes = holdoutChecks.every(check => check.residual === 0) && stateChecks.filter(check => zeroConditionSamples.includes(JSON.stringify(check.parameters))).every(check => check.residual === 0);
  return { parameterVariables: ["a", "b"], degree: 2, coefficients, condition: `${expression}=0`, checks, stateChecks, fitChecks, holdoutChecks, fitResidualMax: Math.max(...fitChecks.map(check => Math.abs(check.residual))), holdoutResidualMax: Math.max(...holdoutChecks.map(check => Math.abs(check.residual))), identifiable: true, generalizes, status: generalizes ? "verified_parameter_condition" : "overfit_candidate", point: points.length === 1 ? primaryPoint : points };
}

function makeCertificate(family, invariant, samples, point = [1, 0]) {
  return { schemaVersion: 1, claim: "inferred_parameter_condition", ...inferCondition(family, invariant, samples, point) };
}

function verifyCertificate(certificate, family, invariant, samples, point = certificate?.point || [1, 0]) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "inferred_parameter_condition") return { status: "invalid_certificate", reason: "证书声明无效" };
    const actual = inferCondition(family, invariant, samples, point);
    if (actual.condition !== certificate.condition || JSON.stringify(actual.coefficients) !== JSON.stringify(certificate.coefficients)) return { status: "counterexample_found", reason: "参数条件在新样本上改变", condition: actual.condition };
    return actual.generalizes ? { status: "verified_parameter_condition", condition: actual.condition, holdoutChecks: actual.holdoutChecks } : { status: "counterexample_found", condition: actual.condition, holdoutChecks: actual.holdoutChecks };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

module.exports = { inferCondition, makeCertificate, verifyCertificate, features };
