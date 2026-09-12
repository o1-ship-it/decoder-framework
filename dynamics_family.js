// Discover invariants shared by a parameterized family of polynomial maps.

const dynamics = require("./dynamics_invariant.js");

function discoverCommonInvariants(family, samples, maxDegree = 2) {
  if (typeof family !== "function" || !Array.isArray(samples) || samples.length === 0) throw new TypeError("需要参数族函数和非空样本");
  const results = samples.map(parameters => ({ parameters, result: dynamics.discoverLinear(family(parameters), maxDegree) }));
  // Compare actual polynomial identities rather than basis labels: a nullspace
  // basis may rotate between parameter instances even when the invariant space
  // is the same.
  const firstCandidates = results[0].result.invariants.filter(candidate => results.every(item => dynamics.verifyInvariant(candidate, family(item.parameters))));
  return { maxDegree, sampleCount: samples.length, samples, invariants: firstCandidates, perSampleCounts: results.map(item => item.result.invariants.length), limits: ["参数化映射族由调用者提供", `次数≤${maxDegree}`, "共同不变量只对给定样本和验证方法负责"] };
}

function makeCertificate(family, samples, maxDegree = 2) {
  const result = discoverCommonInvariants(family, samples, maxDegree);
  return { schemaVersion: 1, claim: "parameterized_family_invariants", ...result };
}

function verifyCertificate(certificate, family, parameters) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "parameterized_family_invariants") return { status: "invalid_certificate", reason: "证书声明无效" };
    if (typeof family !== "function") return { status: "invalid_certificate", reason: "缺少参数族函数" };
    const map = family(parameters);
    for (const invariant of certificate.invariants || []) if (!dynamics.verifyInvariant(invariant, map)) return { status: "counterexample_found", rule: invariant.rule };
    return { status: "verified_family_instance", invariantCount: (certificate.invariants || []).length, parameters };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

module.exports = { discoverCommonInvariants, makeCertificate, verifyCertificate };
