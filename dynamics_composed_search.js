// Search a finite composition: coordinate representation transform + invariant discovery.
const dynamics = require("./dynamics_invariant.js");

const transforms = {
  identity: { x: [{ coefficient: 1, powers: [1, 0] }], y: [{ coefficient: 1, powers: [0, 1] }], inverse: { x: [{ coefficient: 1, powers: [1, 0] }], y: [{ coefficient: 1, powers: [0, 1] }] } },
  swap: { x: [{ coefficient: 1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }], inverse: { x: [{ coefficient: 1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }] } },
  negate_x: { x: [{ coefficient: -1, powers: [1, 0] }], y: [{ coefficient: 1, powers: [0, 1] }], inverse: { x: [{ coefficient: -1, powers: [1, 0] }], y: [{ coefficient: 1, powers: [0, 1] }] } },
  negate_y: { x: [{ coefficient: 1, powers: [1, 0] }], y: [{ coefficient: -1, powers: [0, 1] }], inverse: { x: [{ coefficient: 1, powers: [1, 0] }], y: [{ coefficient: -1, powers: [0, 1] }] } },
  rotate90: { x: [{ coefficient: -1, powers: [0, 1] }], y: [{ coefficient: 1, powers: [1, 0] }], inverse: { x: [{ coefficient: 1, powers: [0, 1] }], y: [{ coefficient: -1, powers: [1, 0] }] } },
};

function validateMap(map) { if (!map?.x || !map?.y) throw new TypeError("组合动力学搜索需要二维多项式映射"); }
function transformMap(map, name) {
  validateMap(map); const transform = transforms[name]; if (!transform) throw new RangeError(`未知表示变换: ${name}`);
  const preimage = { x: dynamics.substitute(transform.inverse.x, { x: [{ coefficient: 1, powers: [1, 0] }], y: [{ coefficient: 1, powers: [0, 1] }] }), y: transform.inverse.y };
  const pulled = { x: dynamics.substitute(map.x, { x: transform.inverse.x, y: transform.inverse.y }), y: dynamics.substitute(map.y, { x: transform.inverse.x, y: transform.inverse.y }) };
  return { x: dynamics.substitute(transform.x, pulled), y: dynamics.substitute(transform.y, pulled), preimage };
}
function pullback(polynomial, name) { const transform = transforms[name]; return dynamics.substitute(polynomial, { x: transform.x, y: transform.y }); }

function search(map, options = {}) {
  validateMap(map); const names = options.transforms || Object.keys(transforms); const maxDegree = options.maxDegree || 2; const candidates = [];
  for (const name of names) { const transformedMap = transformMap(map, name); const discovered = options.method === "enumeration" ? dynamics.discover(transformedMap, maxDegree, options.coefficientRange || 1) : dynamics.discoverLinear(transformedMap, maxDegree); for (const invariant of discovered.invariants) candidates.push({ transform: name, transformedRule: invariant.rule, transformedPolynomial: invariant.polynomial, originalPolynomial: pullback(invariant.polynomial, name), originalRule: dynamics.format(pullback(invariant.polynomial, name)), search: { maxDegree, method: options.method || "linear_nullspace", coefficientRange: options.coefficientRange || 1 } }); }
  const unique = new Map(candidates.map(candidate => [`${candidate.transform}:${candidate.originalRule}`, candidate]));
  return { decoder: "composed_dynamics_search", candidates: [...unique.values()], transforms: names, limits: ["有限线性坐标变换", `次数≤${maxDegree}`, "变换后的不变量在原坐标中拉回验证"] };
}
function makeCertificate(map, options = {}) { const result = search(map, options); return { schemaVersion: 1, claim: "composed_dynamics_invariants", map, search: { transforms: result.transforms, maxDegree: options.maxDegree || 2, method: options.method || "linear_nullspace", coefficientRange: options.coefficientRange || 1 }, candidates: result.candidates, limits: result.limits }; }
function verifyCertificate(certificate, inputMap) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "composed_dynamics_invariants") return { status: "invalid_certificate" };
    if (JSON.stringify(certificate.map) !== JSON.stringify(inputMap)) return { status: "counterexample_found", reason: "输入映射与证书不一致" };
    const replay = makeCertificate(inputMap, certificate.search); const expected = replay.candidates.map(item => `${item.transform}:${item.originalRule}`); const actual = (certificate.candidates || []).map(item => `${item.transform}:${item.originalRule}`);
    if (JSON.stringify(expected) !== JSON.stringify(actual)) return { status: "invalid_certificate", reason: "组合候选无法重放" };
    for (const item of certificate.candidates) { if (!dynamics.equal(dynamics.substitute(item.transformedPolynomial, transforms[item.transform]), item.originalPolynomial)) return { status: "invalid_certificate", reason: "原坐标拉回不一致" }; if (!dynamics.verifyInvariant({ polynomial: item.originalPolynomial }, inputMap)) return { status: "counterexample_found", rule: item.originalRule }; }
    return { status: certificate.candidates.length ? "verified_composed_dynamics" : "uncertain_no_composed_invariant", candidateCount: certificate.candidates.length };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}
module.exports = { transforms, transformMap, pullback, search, makeCertificate, verifyCertificate };
