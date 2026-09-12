const fs = require("node:fs");
const path = require("node:path");
const decoder = require("./polynomial_decoder.js");
const verifier = require("./polynomial_verifier.js");

function main() {
  const expression = { terms: [
    { coefficient: 2, powers: { x: 1, y: 1 } },
    { coefficient: 4, powers: { y: 2 } },
    { coefficient: 4, powers: { x: 1, y: 1 } },
    { coefficient: -2, powers: { z: 1 } },
    { coefficient: 0, powers: { x: 9 } },
  ] };
  const equivalent = { terms: [
    { coefficient: 12, powers: { x: 1, y: 1 } },
    { coefficient: 8, powers: { y: 2 } },
    { coefficient: -4, powers: { z: 1 } },
  ] };
  const wrong = { terms: [...equivalent.terms.slice(0, 2), { coefficient: -5, powers: { z: 1 } }] };
  const certificate = decoder.makeCertificate(expression);
  const report = { decoded: decoder.decode(expression), equivalentVerification: verifier.verifyCertificate(certificate, equivalent), wrongVerification: verifier.verifyCertificate(certificate, wrong), certificate };
  const output = path.join(__dirname, "polynomial_decoder_v0_1.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2), "utf8");
  console.log(`同类项与整体倍乘：${report.equivalentVerification.status}`);
  console.log(`错误项：${report.wrongVerification.status}`);
  console.log(`已写入 ${output}`);
}

module.exports = { main };
if (require.main === module) main();
