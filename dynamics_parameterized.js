// A bounded parameterized decoder for the rotation-scaling family.
// F(a,b)(x,y) = (a*x-b*y, b*x+a*y).

function validateParameters(parameters) {
  if (!parameters || !Number.isSafeInteger(parameters.a) || !Number.isSafeInteger(parameters.b)) throw new TypeError("参数必须是安全整数 a,b");
  return { a: parameters.a, b: parameters.b };
}

function radiusResidual(parameters) {
  const { a, b } = validateParameters(parameters);
  return a * a + b * b - 1;
}

function discover(parameters) {
  const normalized = validateParameters(parameters);
  const residual = radiusResidual(normalized);
  return {
    family: "rotation_scaling",
    parameters: normalized,
    candidates: residual === 0 ? [{ rule: "x^2+y^2", polynomial: [{ coefficient: 1, powers: [2, 0] }, { coefficient: 1, powers: [0, 2] }] }] : [],
    condition: "a^2+b^2=1",
    residual,
    limits: ["二维整数参数旋转缩放族", "当前只搜索半径平方不变量", "未满足条件时不代表不存在其他类型不变量"],
  };
}

function makeCertificate(parameters) {
  const result = discover(parameters);
  return { schemaVersion: 1, claim: "parameterized_dynamics_invariant", ...result };
}

function verifyCertificate(certificate, parameters) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "parameterized_dynamics_invariant") return { status: "invalid_certificate", reason: "证书声明无效" };
    const actual = discover(parameters);
    if (actual.parameters.a !== certificate.parameters.a || actual.parameters.b !== certificate.parameters.b) return { status: "counterexample_found", reason: "参数改变" };
    if (certificate.family !== actual.family || certificate.condition !== actual.condition) return { status: "invalid_certificate", reason: "参数条件被篡改" };
    if (actual.residual !== certificate.residual || JSON.stringify(actual.candidates) !== JSON.stringify(certificate.candidates)) return { status: "invalid_certificate", reason: "参数化候选无法重算" };
    return actual.candidates.length ? { status: "verified_parameter_condition", condition: actual.condition, residual: actual.residual } : { status: "uncertain_parameter_region", condition: actual.condition, residual: actual.residual };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

module.exports = { validateParameters, radiusResidual, discover, makeCertificate, verifyCertificate };
