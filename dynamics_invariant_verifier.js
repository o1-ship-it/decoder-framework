// Independent replay and boundary checks for polynomial-dynamics certificates.

const dynamics = require("./dynamics_invariant.js");

function canonicalPolynomial(polynomial) {
  return dynamics.clean(polynomial).sort((a, b) => a.powers[0] - b.powers[0] || a.powers[1] - b.powers[1] || a.coefficient - b.coefficient);
}

function validateMap(map) {
  if (!map || !Array.isArray(map.x) || !Array.isArray(map.y)) throw new TypeError("映射必须包含 x 和 y 多项式");
  for (const polynomial of [map.x, map.y]) for (const term of polynomial) {
    if (!term || !Number.isSafeInteger(term.coefficient) || !Array.isArray(term.powers) || term.powers.length !== 2 || !term.powers.every(power => Number.isSafeInteger(power) && power >= 0)) throw new TypeError("映射项格式无效");
  }
  return { x: canonicalPolynomial(map.x), y: canonicalPolynomial(map.y) };
}

function sameMap(left, right) {
  return JSON.stringify(validateMap(left)) === JSON.stringify(validateMap(right));
}

function evaluateMap(map, x, y) {
  return [dynamics.evaluate(map.x, x, y), dynamics.evaluate(map.y, x, y)];
}

function verifyCertificate(certificate, inputMap, options = {}) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "polynomial_dynamics_invariants") return { status: "invalid_certificate", reason: "证书声明无效" };
    const map = validateMap(inputMap);
    if (!sameMap(certificate.map, map)) return { status: "counterexample_found", reason: "映射改变，输入与证书不一致" };
    const search = certificate.search;
    if (!search || !Number.isSafeInteger(search.maxDegree) || !Number.isSafeInteger(search.coefficientRange) || search.maxDegree < 1 || search.maxDegree > 4 || search.coefficientRange < 0 || ![undefined, "enumeration", "linear_nullspace"].includes(search.method)) return { status: "invalid_certificate", reason: "搜索范围缺失或无效" };
    const replay = search.method === "linear_nullspace" ? dynamics.discoverLinear(map, search.maxDegree) : dynamics.discover(map, search.maxDegree, search.coefficientRange);
    if (!certificate.representation || certificate.representation.audience !== "machine" || certificate.representation.decoder !== (search.method || "enumeration") || certificate.representation.basisSize !== replay.basis.length || certificate.representation.candidateCount !== replay.invariants.length) return { status: "invalid_certificate", reason: "机器内部表示摘要被篡改" };
    const expectedRules = replay.invariants.map(item => item.rule);
    const actualInvariants = Array.isArray(certificate.invariants) ? certificate.invariants : null;
    if (!actualInvariants) return { status: "invalid_certificate", reason: "候选不变量缺失" };
    const actualRules = actualInvariants.map(item => item && item.rule);
    if (actualRules.length !== expectedRules.length || actualRules.some((rule, index) => rule !== expectedRules[index])) return { status: "invalid_certificate", reason: "候选不变量与搜索结果不一致" };

    const points = options.points || [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 2], [2, -1]];
    const trajectoryChecks = [];
    for (const invariant of actualInvariants) {
      if (!invariant || !Array.isArray(invariant.polynomial) || dynamics.format(invariant.polynomial) !== invariant.rule) return { status: "invalid_certificate", reason: "不变量格式或规则文本被篡改" };
      if (!dynamics.verifyInvariant(invariant, map)) return { status: "counterexample_found", reason: "证书中的不变量不满足符号恒等式", rule: invariant.rule };
      for (const [x, y] of points) {
        const image = evaluateMap(map, x, y);
        const before = dynamics.evaluate(invariant.polynomial, x, y);
        const after = dynamics.evaluate(invariant.polynomial, image[0], image[1]);
        trajectoryChecks.push({ rule: invariant.rule, point: [x, y], residual: after - before });
        if (after !== before) return { status: "counterexample_found", reason: "轨道检查点发现守恒量反例", rule: invariant.rule, point: [x, y], residual: after - before };
      }
    }
    return { status: "verified_dynamics_invariants", invariantCount: actualInvariants.length, search, trajectoryChecks };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

module.exports = { canonicalPolynomial, validateMap, sameMap, evaluateMap, verifyCertificate };
