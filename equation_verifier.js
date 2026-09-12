// Independent checker for linear-equation certificates.

const { normalizeEquation } = require("./equation_decoder.js");

function equalEquation(left, right) {
  return JSON.stringify(normalizeEquation(left)) === JSON.stringify(normalizeEquation(right));
}

function verifyCertificate(certificate, input) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "linear_equation_normal_form") return { status: "invalid_certificate", reason: "证书声明无效" };
    const actual = normalizeEquation(input);
    if (!equalEquation(actual, certificate.source)) return { status: "counterexample_found", reason: "输入方程不满足证书来源" };
    if (!equalEquation(actual, certificate.hypothesis)) return { status: "invalid_certificate", reason: "规范形式无法重算" };
    return { status: "verified_equation", variables: Object.keys(actual.terms).length };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

function verifyRenameEquivalence(left, right, mapping) {
  try {
    const renamed = require("./equation_decoder.js").renameVariables(left, mapping);
    return { status: equalEquation(renamed, right) ? "verified_under_rename" : "counterexample_found", renamed };
  } catch (error) { return { status: "invalid_input", reason: error.message }; }
}

module.exports = { equalEquation, verifyCertificate, verifyRenameEquivalence };
