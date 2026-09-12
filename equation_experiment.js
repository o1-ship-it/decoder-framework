const fs = require("node:fs");
const path = require("node:path");
const decoder = require("./equation_decoder.js");
const verifier = require("./equation_verifier.js");

function main() {
  const original = { terms: { x: 6, y: -3 }, constant: 9 };
  const scaled = { terms: { x: 12, y: -6 }, constant: 18 };
  const renamed = { terms: { u: 2, v: -1 }, constant: 3 };
  const wrong = { terms: { x: 6, y: -3 }, constant: 10 };
  const certificate = decoder.makeCertificate(original);
  const report = {
    schemaVersion: 1,
    decoded: decoder.decode(original),
    scaledEquivalence: verifier.equalEquation(original, scaled),
    renameEquivalence: verifier.verifyRenameEquivalence(original, renamed, { x: "u", y: "v" }),
    originalVerification: verifier.verifyCertificate(certificate, original),
    scaledVerification: verifier.verifyCertificate(certificate, scaled),
    wrongVerification: verifier.verifyCertificate(certificate, wrong),
    certificate,
  };
  const output = path.join(__dirname, "equation_decoder_v0_1.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2), "utf8");
  console.log(`整体倍乘保持等价：${report.scaledEquivalence}`);
  console.log(`变量重命名验证：${report.renameEquivalence.status}`);
  console.log(`错误常数验证：${report.wrongVerification.status}`);
  console.log(`已写入 ${output}`);
}

module.exports = { main };
if (require.main === module) main();
