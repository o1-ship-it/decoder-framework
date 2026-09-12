// Compare decoder behavior under ordinary holdout and shifted stress data.

function evaluate(runDecoder, train, test, stress) {
  if (typeof runDecoder !== "function" || !Array.isArray(train) || !Array.isArray(test) || !Array.isArray(stress) || test.length === 0 || stress.length === 0) throw new TypeError("需要解码器函数、训练集、测试集和 stress 集");
  const ordinary = runDecoder(train, test); const shifted = runDecoder(train, stress);
  const ordinaryOk = ordinary?.residual === 0 || String(ordinary?.verification || "").startsWith("verified");
  const shiftedOk = shifted?.residual === 0 || String(shifted?.verification || "").startsWith("verified");
  return { ordinary: { verification: ordinary?.verification || ordinary?.status, residual: ordinary?.residual ?? null }, stress: { verification: shifted?.verification || shifted?.status, residual: shifted?.residual ?? null }, distributionShift: ordinaryOk && !shiftedOk, classification: ordinaryOk && shiftedOk ? "stable" : ordinaryOk && !shiftedOk ? "stress_failure" : "ordinary_failure" };
}

module.exports = { evaluate };
