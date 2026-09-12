const decoder = require("./polynomial_decoder.js");
const analysis = require("./polynomial_analysis.js");

function verifyCertificate(certificate, input) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "polynomial_invariant_analysis") return { status: "invalid_certificate", reason: "证书声明无效" };
    const actual = analysis.analyze(input);
    if (JSON.stringify(actual.normalized.terms) !== JSON.stringify(certificate.source.terms)) return { status: "counterexample_found", reason: "源多项式不一致" };
    if (actual.totalDegree !== certificate.analysis.totalDegree || actual.homogeneous !== certificate.analysis.homogeneous || actual.eulerIdentity !== certificate.analysis.eulerIdentity) return { status: "invalid_certificate", reason: "不变量分析无法重算" };
    return { status: "verified_polynomial_analysis", totalDegree: actual.totalDegree, homogeneous: actual.homogeneous, eulerIdentity: actual.eulerIdentity };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

module.exports = { verifyCertificate };
