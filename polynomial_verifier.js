const decoder = require("./polynomial_decoder.js");

function verifyCertificate(certificate, input) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "polynomial_normal_form") return { status: "invalid_certificate", reason: "证书声明无效" };
    const actual = decoder.normalizePolynomial(input);
    const termsEqual = JSON.stringify(actual.terms) === JSON.stringify(certificate.source.terms) && JSON.stringify(actual.terms) === JSON.stringify(certificate.hypothesis.terms);
    if (!termsEqual) return { status: "counterexample_found", reason: "多项式规范形式不一致" };
    return { status: "verified_polynomial", termCount: actual.terms.length };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

module.exports = { verifyCertificate };
