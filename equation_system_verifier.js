// Independent-facing checker for row-reduction certificates.

const systems = require("./equation_system.js");

function equalRref(left, right) {
  return JSON.stringify(systems.rrefSystem(left)) === JSON.stringify(systems.rrefSystem(right));
}

function verifyCertificate(certificate, input) {
  try {
    if (!certificate || certificate.schemaVersion !== 2 || certificate.claim !== "linear_system_rref") return { status: "invalid_certificate", reason: "证书声明无效" };
    const actual = systems.rrefSystem(input);
    if (JSON.stringify(actual) !== JSON.stringify(certificate.source)) return { status: "counterexample_found", reason: "输入方程组的 RREF 与来源不一致" };
    if (JSON.stringify(actual) !== JSON.stringify(certificate.hypothesis)) return { status: "invalid_certificate", reason: "RREF 假设无法重算" };
    if (JSON.stringify(systems.deriveConclusions(actual)) !== JSON.stringify(certificate.conclusions)) return { status: "invalid_certificate", reason: "消元结论无法重算" };
    const suppliedInput = systems.normalizeInput(input);
    const serialInput = { variables: suppliedInput.variables, equations: suppliedInput.equations.map(equation => ({ coefficients: equation.coefficients.map(String), constant: String(equation.constant) })) };
    const isSourceInput = JSON.stringify(serialInput) === JSON.stringify(certificate.input);
    if (isSourceInput) {
      const replayed = replayTrace(input, certificate.trace);
      if (JSON.stringify(replayed) !== JSON.stringify(actual.rref)) return { status: "invalid_certificate", reason: "推理轨迹重放结果不一致" };
    }
    return { status: "verified_system", rank: actual.rank, consistent: actual.consistent, freeVariables: actual.freeVariables };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

function parseFraction(value) {
  if (typeof value !== "string" || !/^-?\d+(?:\/\d+)?$/.test(value)) throw new TypeError("轨迹系数无效");
  const parts = value.split("/");
  return systems.fraction(BigInt(parts[0]), BigInt(parts[1] || 1));
}

function replayTrace(input, trace) {
  if (!Array.isArray(trace)) throw new TypeError("缺少推理轨迹");
  const normalized = systems.normalizeInput(input);
  const matrix = normalized.equations.map(equation => [...equation.coefficients.map(value => systems.fraction(value)), systems.fraction(equation.constant)]);
  const add = (a, b) => systems.fraction(a.n * b.d + b.n * a.d, a.d * b.d);
  const mul = (a, b) => systems.fraction(a.n * b.n, a.d * b.d);
  for (const step of trace) {
    if (step.op === "swap") {
      if (!Number.isSafeInteger(step.rowA) || !Number.isSafeInteger(step.rowB) || !matrix[step.rowA] || !matrix[step.rowB]) throw new Error("换行轨迹越界");
      [matrix[step.rowA], matrix[step.rowB]] = [matrix[step.rowB], matrix[step.rowA]];
    } else if (step.op === "scale") {
      if (!Number.isSafeInteger(step.row) || !matrix[step.row]) throw new Error("缩放轨迹越界");
      const factor = parseFraction(step.factor);
      if (factor.n === 0n) throw new Error("缩放因子不能为零");
      matrix[step.row] = matrix[step.row].map(value => mul(value, factor));
    } else if (step.op === "add") {
      if (!Number.isSafeInteger(step.target) || !Number.isSafeInteger(step.source) || !matrix[step.target] || !matrix[step.source]) throw new Error("消元轨迹越界");
      const factor = parseFraction(step.factor);
      matrix[step.target] = matrix[step.target].map((value, index) => add(value, mul(factor, matrix[step.source][index])));
    } else throw new Error(`未知轨迹操作: ${step.op}`);
  }
  return matrix.map(row => row.map(systems.serialize));
}

function verifyConclusions(input) {
  const reduced = systems.rrefSystem(input);
  const conclusions = systems.deriveConclusions(reduced);
  return { status: "verified_elimination", consistent: reduced.consistent, unique: conclusions.unique ?? false, conclusions };
}

function verifyEquivalent(left, right) {
  try { return { status: equalRref(left, right) ? "verified_row_equivalence" : "counterexample_found" }; }
  catch (error) { return { status: "invalid_input", reason: error.message }; }
}

module.exports = { equalRref, verifyCertificate, verifyEquivalent, verifyConclusions, replayTrace };
