// Robust arithmetic decoder for bounded additive noise.

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
}

function decode(development, holdout = [], tolerance = 1) {
  if (!Array.isArray(development) || development.length < 4 || !development.every(Number.isFinite)) throw new TypeError("带噪数列需要至少 4 个有限数值");
  if (!Array.isArray(holdout) || !holdout.every(Number.isFinite)) throw new TypeError("留出数据必须是有限数值数组");
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new TypeError("噪声容差必须非负");
  const differences = development.slice(1).map((value, index) => value - development[index]);
  const meanIndex = (development.length - 1) / 2; const meanValue = development.reduce((sum, value) => sum + value, 0) / development.length;
  const denominator = development.reduce((sum, _, index) => sum + (index - meanIndex) ** 2, 0);
  const step = development.reduce((sum, value, index) => sum + (index - meanIndex) * (value - meanValue), 0) / denominator;
  const intercept = meanValue - step * meanIndex;
  const predict = index => intercept + step * index;
  const fitResiduals = development.map((value, index) => value - predict(index));
  const holdoutResiduals = holdout.map((value, index) => value - predict(development.length + index));
  const fitMax = Math.max(...fitResiduals.map(Math.abs));
  const holdoutMax = holdoutResiduals.length ? Math.max(...holdoutResiduals.map(Math.abs)) : null;
  const verified = fitMax <= tolerance && (holdoutMax === null || holdoutMax <= tolerance);
  return { decoder: "robust_arithmetic", model: { intercept, step }, tolerance, fitResidualMax: fitMax, holdoutResidualMax: holdoutMax, forecast: holdout.map((_, index) => predict(development.length + index)), status: verified ? "verified_noisy_sequence" : "uncertain_noisy_sequence", residual: verified ? 0 : 1, limits: ["加性噪声近似恒定步长", `容差≤${tolerance}`, "中位数估计不是噪声分布下的最优估计"] };
}

module.exports = { median, decode };
