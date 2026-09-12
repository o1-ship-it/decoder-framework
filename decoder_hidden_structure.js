// Discover modular affine recurrences x[n+1] = (a*x[n] + b) mod m.

function discover(development, holdout = [], options = {}) {
  if (!Array.isArray(development) || development.length < 6 || !development.every(Number.isSafeInteger)) throw new TypeError("隐藏结构序列需要至少 6 个整数");
  if (!Array.isArray(holdout) || !holdout.every(Number.isSafeInteger)) throw new TypeError("留出序列必须是整数数组");
  const minModulus = options.minModulus || 2; const maxModulus = options.maxModulus || 32;
  const candidates = [];
  for (let m = minModulus; m <= maxModulus; m += 1) for (let a = 0; a < m; a += 1) for (let b = 0; b < m; b += 1) {
    const fits = development.every((value, index) => index === 0 || value === ((a * development[index - 1] + b) % m));
    if (!fits) continue;
    const forecast = []; let current = development.at(-1); for (let i = 0; i < holdout.length; i += 1) { current = (a * current + b) % m; forecast.push(current); }
    const errors = holdout.map((value, index) => value - forecast[index]);
    candidates.push({ modulus: m, multiplier: a, offset: b, forecast, holdoutResidualMax: errors.length ? Math.max(...errors.map(Math.abs)) : null });
  }
  candidates.sort((left, right) => (left.holdoutResidualMax ?? 0) - (right.holdoutResidualMax ?? 0) || left.modulus - right.modulus || left.multiplier - right.multiplier || left.offset - right.offset);
  const winner = candidates[0] || null; const verified = Boolean(winner && (winner.holdoutResidualMax === null || winner.holdoutResidualMax === 0));
  return { decoder: "modular_affine_recurrence", winner, candidateCount: candidates.length, status: verified ? "verified_hidden_structure" : "uncertain_hidden_structure", residual: verified ? 0 : 1, limits: [`模数${minModulus}..${maxModulus}`, "模仿射一阶递推", "有限参数搜索不代表不存在其他生成机制"] };
}
function makeCertificate(development, holdout, options = {}) { return { schemaVersion: 1, claim: "hidden_structure_sequence", development, holdout, options, result: discover(development, holdout, options) }; }
function verifyCertificate(certificate) {
  try { if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "hidden_structure_sequence") return { status: "invalid_certificate" }; const replay = discover(certificate.development, certificate.holdout, certificate.options); if (JSON.stringify(replay.winner) !== JSON.stringify(certificate.result.winner) || replay.status !== certificate.result.status) return { status: "invalid_certificate", reason: "隐藏结构候选无法重放" }; return { status: replay.status, residual: replay.residual, candidateCount: replay.candidateCount }; } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}
module.exports = { discover, makeCertificate, verifyCertificate };
