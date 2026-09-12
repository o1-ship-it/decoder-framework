// Infer a linear condition over an arbitrary list of numeric parameters.
const dynamics = require("./dynamics_invariant.js");

function inferLinearCondition(family, invariant, parameterNames, samples, fitCount = parameterNames.length + 1, point = [1, 0]) {
  if (typeof family !== "function" || !invariant?.polynomial || !Array.isArray(parameterNames) || parameterNames.length === 0 || !Array.isArray(samples) || samples.length <= fitCount || fitCount !== parameterNames.length + 1) throw new TypeError("需要参数族、不变量、参数名和拟合集外样本");
  const feature = sample => [1, ...parameterNames.map(name => Number(sample[name]))];
  const residualAt = sample => { const map = family(sample); const image = [dynamics.evaluate(map.x, point[0], point[1]), dynamics.evaluate(map.y, point[0], point[1])]; return dynamics.evaluate(invariant.polynomial, image[0], image[1]) - dynamics.evaluate(invariant.polynomial, point[0], point[1]); };
  const fit = samples.slice(0, fitCount); const matrix = fit.map(sample => feature(sample)); const augmented = matrix.map((row, i) => row.concat(residualAt(fit[i]))); const n = fitCount;
  for (let column = 0; column < n; column += 1) { let pivot = column; for (let row = column + 1; row < n; row += 1) if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row; if (Math.abs(augmented[pivot][column]) < 1e-9) throw new Error("多参数样本秩不足以确定条件"); [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]]; const scale = augmented[column][column]; for (let j = column; j <= n; j += 1) augmented[column][j] /= scale; for (let row = 0; row < n; row += 1) if (row !== column) { const factor = augmented[row][column]; for (let j = column; j <= n; j += 1) augmented[row][j] -= factor * augmented[column][j]; } }
  const coefficients = augmented.map(row => Math.abs(row[n]) < 1e-8 ? 0 : Math.round(row[n]));
  const checks = samples.map(sample => { const actual = residualAt(sample); const predicted = feature(sample).reduce((sum, value, index) => sum + coefficients[index] * value, 0); return { parameters: sample, actual, predicted, residual: actual - predicted }; });
  const holdoutChecks = checks.slice(fitCount); const generalizes = holdoutChecks.every(check => check.residual === 0);
  const terms = coefficients.map((coefficient, index) => { if (!coefficient) return null; const name = index === 0 ? "" : parameterNames[index - 1]; if (coefficient === 1) return name || "1"; if (coefficient === -1) return name ? `-${name}` : "-1"; return name ? `${coefficient} ${name}` : `${coefficient}`; }).filter(Boolean);
  return { parameterVariables: parameterNames, degree: 1, coefficients, condition: `${terms.join(" + ").replace(/\+ -/g, "- ")}=0`, fitChecks: checks.slice(0, fitCount), holdoutChecks, fitResidualMax: Math.max(...checks.slice(0, fitCount).map(check => Math.abs(check.residual))), holdoutResidualMax: Math.max(...holdoutChecks.map(check => Math.abs(check.residual)), 0), identifiable: true, generalizes, status: generalizes ? "verified_parameter_condition" : "overfit_candidate" };
}

module.exports = { inferLinearCondition };
