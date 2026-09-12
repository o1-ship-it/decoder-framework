// Minimal generalization: infer a linear condition in one named parameter.
const dynamics = require("./dynamics_invariant.js");

function inferLinearCondition(family, invariant, parameterName, samples, point = [1, 0]) {
  if (typeof family !== "function" || !invariant?.polynomial || typeof parameterName !== "string" || !Array.isArray(samples) || samples.length < 2) throw new TypeError("需要参数族、不变量、参数名和至少 2 个样本");
  const values = samples.map(sample => sample[parameterName]);
  const residuals = samples.map(sample => { const map = family(sample); const image = [dynamics.evaluate(map.x, point[0], point[1]), dynamics.evaluate(map.y, point[0], point[1])]; return dynamics.evaluate(invariant.polynomial, image[0], image[1]) - dynamics.evaluate(invariant.polynomial, point[0], point[1]); });
  const denominator = values.reduce((sum, value) => sum + (value - values[0]) ** 2, 0);
  if (denominator === 0) throw new Error("参数样本没有变化");
  const fitValues = values.slice(0, 2); const fitResiduals = residuals.slice(0, 2);
  const fitDenominator = (fitValues[1] - fitValues[0]) ** 2;
  if (fitDenominator === 0) throw new Error("拟合参数样本没有变化");
  const slope = (fitResiduals[1] - fitResiduals[0]) / (fitValues[1] - fitValues[0]);
  const intercept = fitResiduals[0] - slope * fitValues[0];
  const coefficients = [Math.round(intercept), Math.round(slope)];
  const condition = `${coefficients[1] === 1 ? parameterName : `${coefficients[1]} ${parameterName}`} ${coefficients[0] >= 0 ? "+" : "-"} ${Math.abs(coefficients[0])}=0`;
  const checks = samples.map((sample, index) => ({ parameters: sample, actual: residuals[index], predicted: coefficients[0] + coefficients[1] * sample[parameterName], residual: residuals[index] - (coefficients[0] + coefficients[1] * sample[parameterName]) }));
  const fitChecks = checks.slice(0, 2); const holdoutChecks = checks.slice(2); const generalizes = holdoutChecks.every(check => check.residual === 0);
  return { parameterVariables: [parameterName], degree: 1, coefficients, condition, checks, fitChecks, holdoutChecks, fitResidualMax: Math.max(...fitChecks.map(check => Math.abs(check.residual))), holdoutResidualMax: Math.max(...holdoutChecks.map(check => Math.abs(check.residual)), 0), identifiable: true, generalizes, status: generalizes ? "verified_parameter_condition" : "overfit_candidate" };
}

module.exports = { inferLinearCondition };

function inferPolynomialCondition(family, invariant, parameterName, samples, degree = 2, point = [1, 0]) {
  if (typeof family !== "function" || !invariant?.polynomial || typeof parameterName !== "string" || !Array.isArray(samples) || !Number.isSafeInteger(degree) || degree < 1 || samples.length <= degree) throw new TypeError("需要参数族、不变量、参数样本和有效次数");
  const fit = samples.slice(0, degree + 1); const values = fit.map(sample => sample[parameterName]);
  const features = value => Array.from({ length: degree + 1 }, (_, power) => value ** power);
  const residualAt = sample => { const map = family(sample); const image = [dynamics.evaluate(map.x, point[0], point[1]), dynamics.evaluate(map.y, point[0], point[1])]; return dynamics.evaluate(invariant.polynomial, image[0], image[1]) - dynamics.evaluate(invariant.polynomial, point[0], point[1]); };
  const matrix = fit.map(sample => features(sample[parameterName])); const rhs = fit.map(residualAt); const augmented = matrix.map((row, i) => row.concat(rhs[i]));
  for (let column = 0; column <= degree; column += 1) { let pivot = column; for (let row = column + 1; row <= degree; row += 1) if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row; if (Math.abs(augmented[pivot][column]) < 1e-9) throw new Error("参数样本不足以确定多项式条件"); [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]]; const scale = augmented[column][column]; for (let j = column; j <= degree + 1; j += 1) augmented[column][j] /= scale; for (let row = 0; row <= degree; row += 1) if (row !== column) { const factor = augmented[row][column]; for (let j = column; j <= degree + 1; j += 1) augmented[row][j] -= factor * augmented[column][j]; } }
  const coefficients = augmented.map(row => Math.abs(row[degree + 1]) < 1e-8 ? 0 : Math.round(row[degree + 1]));
  const expression = coefficients.map((coefficient, power) => { if (!coefficient) return null; const variable = power ? `${parameterName}${power > 1 ? `^${power}` : ""}` : ""; if (power === 0) return `${coefficient}`; if (coefficient === 1) return variable; if (coefficient === -1) return `-${variable}`; return `${coefficient} ${variable}`; }).filter(Boolean).join(" + ").replace(/\+ -/g, "- ") || "0";
  const checks = samples.map(sample => { const actual = residualAt(sample); const predicted = features(sample[parameterName]).reduce((sum, value, index) => sum + coefficients[index] * value, 0); return { parameters: sample, actual, predicted, residual: actual - predicted }; });
  const holdoutChecks = checks.slice(degree + 1); const generalizes = holdoutChecks.every(check => check.residual === 0);
  return { parameterVariables: [parameterName], degree, coefficients, condition: `${expression}=0`, checks, holdoutChecks, fitResidualMax: Math.max(...checks.slice(0, degree + 1).map(check => Math.abs(check.residual))), holdoutResidualMax: Math.max(...holdoutChecks.map(check => Math.abs(check.residual))), identifiable: true, generalizes, status: generalizes ? "verified_parameter_condition" : "overfit_candidate" };
}

module.exports.inferPolynomialCondition = inferPolynomialCondition;

function inferBivariateLinearCondition(family, invariant, samples, point = [1, 0]) {
  if (typeof family !== "function" || !invariant?.polynomial || !Array.isArray(samples) || samples.length <= 3) throw new TypeError("需要参数族、不变量和至少 1 个双参数留出样本");
  const fit = samples.slice(0, 3); const features = sample => [1, sample.a, sample.b];
  const residualAt = sample => { const map = family(sample); const image = [dynamics.evaluate(map.x, point[0], point[1]), dynamics.evaluate(map.y, point[0], point[1])]; return dynamics.evaluate(invariant.polynomial, image[0], image[1]) - dynamics.evaluate(invariant.polynomial, point[0], point[1]); };
  const aug = fit.map(sample => features(sample).concat(residualAt(sample)));
  for (let col = 0; col < 3; col += 1) { let pivot = col; for (let row = col + 1; row < 3; row += 1) if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row; if (Math.abs(aug[pivot][col]) < 1e-9) throw new Error("双参数样本不足以确定条件"); [aug[col], aug[pivot]] = [aug[pivot], aug[col]]; const scale = aug[col][col]; for (let j = col; j < 4; j += 1) aug[col][j] /= scale; for (let row = 0; row < 3; row += 1) if (row !== col) { const factor = aug[row][col]; for (let j = col; j < 4; j += 1) aug[row][j] -= factor * aug[col][j]; } }
  const coefficients = aug.map(row => Math.abs(row[3]) < 1e-8 ? 0 : Math.round(row[3]));
  const checks = samples.map(sample => { const actual = residualAt(sample); const predicted = features(sample).reduce((sum, value, index) => sum + coefficients[index] * value, 0); return { parameters: sample, actual, predicted, residual: actual - predicted }; });
  const generalizes = checks.slice(3).every(check => check.residual === 0);
  return { parameterVariables: ["a", "b"], degree: 1, coefficients, condition: `${coefficients[1]} a + ${coefficients[2]} b + ${coefficients[0]}=0`, checks, fitResidualMax: Math.max(...checks.slice(0, 3).map(check => Math.abs(check.residual))), holdoutResidualMax: Math.max(...checks.slice(3).map(check => Math.abs(check.residual))), identifiable: true, generalizes, status: generalizes ? "verified_parameter_condition" : "overfit_candidate" };
}

module.exports.inferBivariateLinearCondition = inferBivariateLinearCondition;
