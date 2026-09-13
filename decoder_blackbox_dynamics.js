// Discover a polynomial map and its invariant from black-box state transitions.
// Map fitting uses training transitions only; holdout transitions are reserved
// for validation after the candidate map has been frozen.

const dynamics = require("./dynamics_invariant.js");
const dynamicsVerifier = require("./dynamics_invariant_verifier.js");

function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b !== 0n) [a, b] = [b, a % b]; return a || 1n; }
function fraction(n, d = 1n) { if (d === 0n) throw new Error("分母不能为零"); if (d < 0n) [n, d] = [-n, -d]; const g = gcd(n, d); return { n: n / g, d: d / g }; }
function add(a, b) { return fraction(a.n * b.d + b.n * a.d, a.d * b.d); }
function sub(a, b) { return fraction(a.n * b.d - b.n * a.d, a.d * b.d); }
function mul(a, b) { return fraction(a.n * b.n, a.d * b.d); }
function div(a, b) { return fraction(a.n * b.d, a.d * b.n); }

function basis(maxDegree) { const output = []; for (let x = 0; x <= maxDegree; x += 1) for (let y = 0; y <= maxDegree - x; y += 1) output.push([x, y]); return output; }
function normalizeOptions(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("黑箱动力系统选项必须是对象");
  const maxMapDegree = options.maxMapDegree ?? 1;
  const maxInvariantDegree = options.maxInvariantDegree ?? 2;
  const coefficientRange = options.coefficientRange ?? 1;
  if (!Number.isSafeInteger(maxMapDegree) || maxMapDegree < 1 || maxMapDegree > 2) throw new RangeError("黑箱映射次数必须在 1..2");
  if (!Number.isSafeInteger(maxInvariantDegree) || maxInvariantDegree < 1 || maxInvariantDegree > 4) throw new RangeError("黑箱不变量次数必须在 1..4");
  if (!Number.isSafeInteger(coefficientRange) || coefficientRange < 0 || coefficientRange > 3) throw new RangeError("系数范围必须在 0..3");
  return { maxMapDegree, maxInvariantDegree, coefficientRange };
}
function validateTransitions(transitions, label, min) {
  if (!Array.isArray(transitions) || transitions.length < min) throw new TypeError(`${label}至少需要${min}条转移`);
  for (const row of transitions) if (!row || !Array.isArray(row.state) || !Array.isArray(row.next) || row.state.length !== 2 || row.next.length !== 2 || !row.state.concat(row.next).every(Number.isSafeInteger)) throw new TypeError(`${label}包含无效状态转移`);
}
function feature(state, powers) { return powers.map(([x, y]) => BigInt(state[0]) ** BigInt(x) * BigInt(state[1]) ** BigInt(y)); }

function solve(matrix, target) {
  const rows = matrix.map((row, index) => row.map(value => fraction(value)).concat(fraction(target[index])));
  const width = matrix[0].length; let pivotRow = 0;
  for (let column = 0; column < width; column += 1) {
    let selected = pivotRow; while (selected < rows.length && rows[selected][column].n === 0n) selected += 1;
    if (selected === rows.length) continue;
    [rows[pivotRow], rows[selected]] = [rows[selected], rows[pivotRow]];
    const pivot = rows[pivotRow][column]; rows[pivotRow] = rows[pivotRow].map(value => div(value, pivot));
    for (let row = 0; row < rows.length; row += 1) if (row !== pivotRow && rows[row][column].n !== 0n) { const scale = rows[row][column]; rows[row] = rows[row].map((value, index) => sub(value, mul(scale, rows[pivotRow][index]))); }
    pivotRow += 1;
  }
  if (pivotRow !== width) return null;
  if (rows.slice(width).some(row => row.slice(0, width).every(value => value.n === 0n) && row[width].n !== 0n)) return null;
  return rows.slice(0, width).map(row => row[width]);
}
function terms(coefficients, powers) {
  const output = [];
  for (let index = 0; index < coefficients.length; index += 1) { const coefficient = coefficients[index]; if (coefficient.n === 0n) continue; if (coefficient.d !== 1n || coefficient.n > BigInt(Number.MAX_SAFE_INTEGER) || coefficient.n < BigInt(Number.MIN_SAFE_INTEGER)) return null; output.push({ coefficient: Number(coefficient.n), powers: powers[index] }); }
  return output;
}
function inferMap(training, maxDegree = 1) {
  const powers = basis(maxDegree); validateTransitions(training, "训练转移", powers.length);
  const matrix = training.map(row => feature(row.state, powers));
  const xCoefficients = solve(matrix, training.map(row => BigInt(row.next[0])));
  const yCoefficients = solve(matrix, training.map(row => BigInt(row.next[1])));
  if (!xCoefficients || !yCoefficients) {
    return { status: "uncertain_map", reason: "样本秩不足、映射不一致或系数不是安全整数", basis: powers };
  }
  const xTerms = terms(xCoefficients, powers);
  const yTerms = terms(yCoefficients, powers);
  if (!xTerms || !yTerms) return { status: "uncertain_map", reason: "样本秩不足、映射不一致或系数不是安全整数", basis: powers };
  return { status: "inferred_map", basis: powers, map: { x: xTerms, y: yTerms } };
}
function residuals(map, transitions) { return transitions.map(row => { const predicted = [dynamics.evaluate(map.x, row.state[0], row.state[1]), dynamics.evaluate(map.y, row.state[0], row.state[1])]; return { state: row.state, expected: row.next, predicted, residual: [predicted[0] - row.next[0], predicted[1] - row.next[1]] }; }); }
function decode(training, holdout, options = {}) {
  const normalized = normalizeOptions(options); const maxDegree = normalized.maxMapDegree; const maxInvariantDegree = normalized.maxInvariantDegree; validateTransitions(training, "训练转移", 1); validateTransitions(holdout, "留出转移", 1); if (training.length < basis(maxDegree).length) return { decoder: "blackbox_dynamics", status: "uncertain_blackbox_map", residual: null, inference: { status: "uncertain_map", reason: "训练转移数量少于映射基维度", basis: basis(maxDegree) }, limits: ["训练数据不足以唯一确定声明映射空间"] };
  const inferred = inferMap(training, maxDegree); if (inferred.status !== "inferred_map") return { decoder: "blackbox_dynamics", status: "uncertain_blackbox_map", residual: null, inference: inferred, limits: ["训练数据不足以唯一确定声明映射空间"] };
  const holdoutChecks = residuals(inferred.map, holdout); if (holdoutChecks.some(check => check.residual.some(value => value !== 0))) return { decoder: "blackbox_dynamics", status: "counterexample_found", residual: 1, inference: inferred, holdoutChecks, limits: ["留出轨迹拒绝训练阶段推断的映射"] };
  const invariantCertificate = dynamics.makeCertificate(inferred.map, maxInvariantDegree, normalized.coefficientRange, "linear_nullspace"); const verified = dynamicsVerifier.verifyCertificate(invariantCertificate, inferred.map);
  return { decoder: "blackbox_dynamics", status: verified.status === "verified_dynamics_invariants" && invariantCertificate.invariants.length ? "verified_blackbox_structure" : "uncertain_blackbox_structure", residual: verified.status === "verified_dynamics_invariants" && invariantCertificate.invariants.length ? 0 : null, inference: inferred, holdoutChecks, invariantCertificate, verification: verified, limits: ["黑箱映射限制为二维整数多项式", `映射次数≤${maxDegree}`, `不变量次数≤${maxInvariantDegree}`, "有限转移验证不构成未知系统的无条件定理"] };
}
function makeCertificate(training, holdout, options = {}) { const normalized = normalizeOptions(options); return { schemaVersion: 1, claim: "blackbox_dynamics_structure", training, holdout, options: normalized, result: decode(training, holdout, normalized) }; }
function verifyCertificate(certificate) {
  try { if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "blackbox_dynamics_structure") return { status: "invalid_certificate" }; const replay = decode(certificate.training, certificate.holdout, certificate.options); const canonical = value => JSON.stringify(value); if (canonical(replay.inference) !== canonical(certificate.result.inference) || replay.status !== certificate.result.status || canonical(replay.holdoutChecks) !== canonical(certificate.result.holdoutChecks) || canonical(replay.invariantCertificate) !== canonical(certificate.result.invariantCertificate)) return { status: "invalid_certificate", reason: "黑箱推断或留出验证无法重放" }; return { status: replay.status, residual: replay.residual, invariantCount: replay.invariantCertificate?.invariants.length ?? 0 }; } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}
module.exports = { basis, normalizeOptions, inferMap, residuals, decode, makeCertificate, verifyCertificate };
