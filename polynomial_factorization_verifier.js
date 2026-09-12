const polynomial = require("./polynomial_decoder.js");
const factorization = require("./polynomial_factorization.js");

function verifyCertificate(certificate, input) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "polynomial_factorization") return { status: "invalid_certificate", reason: "证书声明无效" };
    const actual = polynomial.normalizePolynomial(input);
    if (JSON.stringify(actual.terms) !== JSON.stringify(certificate.source.terms)) return { status: "counterexample_found", reason: "源多项式不一致" };
    const expanded = factorization.expand(certificate.factorization);
    const terms = expanded.map((coefficient, power) => ({ coefficient, powers: power ? { [certificate.factorization.variable]: power } : {} }));
    if (JSON.stringify(polynomial.normalizePolynomial({ terms }).terms) !== JSON.stringify(actual.terms)) return { status: "invalid_certificate", reason: "因子展开无法还原源多项式" };
    if (JSON.stringify(certificate.expansion) !== JSON.stringify(expanded)) return { status: "invalid_certificate", reason: "展开结果被篡改" };
    return { status: "verified_factorization", complete: certificate.factorization.complete, factorCount: certificate.factorization.factors.length };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

module.exports = { verifyCertificate };
