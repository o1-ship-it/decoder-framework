const fs = require("node:fs");
const path = require("node:path");

function audit(input) {
  if (!input || input.schemaVersion !== 1 || input.claim !== "framework_acceptance") throw new TypeError("验收报告声明无效");
  const rows = input.report?.rows || [];
  const violations = [];
  for (const row of rows) {
    if (row.verificationStrength === "unknown" && row.residual !== null) violations.push({ index: row.index, reason: "未知结果不应有数值残差" });
    if (row.verificationStrength === "verified" && row.residual !== 0) violations.push({ index: row.index, reason: "已验证结果残差必须为 0" });
    if (row.verificationStrength === "refuted" && !(row.residual > 0)) violations.push({ index: row.index, reason: "反例结果必须保留正残差" });
  }
  for (const summary of input.report?.summary || []) {
    const group = rows.filter(row => row.domain === summary.domain);
    const verified = group.filter(row => row.verificationStrength === "verified").length;
    const refuted = group.filter(row => row.verificationStrength === "refuted").length;
    if (summary.total !== group.length || summary.verified !== verified || summary.refuted !== refuted) violations.push({ domain: summary.domain, reason: "分域汇总与明细不一致" });
  }
  return { schemaVersion: 1, claim: "decoder_audit", passed: violations.length === 0, checked: rows.length, violations, rule: "unknown 不计入 verified；refuted 必须保留反例残差" };
}

function main() {
  const source = JSON.parse(fs.readFileSync(path.join(__dirname, "decoder_acceptance_v1.json"), "utf8"));
  const result = audit(source); fs.writeFileSync(path.join(__dirname, "decoder_audit_v1.json"), JSON.stringify(result, null, 2), "utf8"); console.log(`审计：${result.checked} 条结果，${result.passed ? "通过" : "发现问题"}`); return result;
}

if (require.main === module) main();
module.exports = { audit, main };
