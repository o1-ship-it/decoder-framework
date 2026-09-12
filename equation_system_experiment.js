const fs = require("node:fs");
const path = require("node:path");
const decoder = require("./equation_system.js");
const verifier = require("./equation_system_verifier.js");

function main() {
  const original = { equations: [
    { terms: { x: 2, y: 1 }, constant: 5 },
    { terms: { x: 1, y: -1 }, constant: 1 },
  ] };
  const rowEquivalent = { equations: [
    { terms: { x: 4, y: 2 }, constant: 10 },
    { terms: { x: 1, y: -1 }, constant: 1 },
  ] };
  const dependent = { equations: [
    { terms: { x: 2, y: 1 }, constant: 5 },
    { terms: { x: 4, y: 2 }, constant: 10 },
  ] };
  const inconsistent = { equations: [
    { terms: { x: 2, y: 1 }, constant: 5 },
    { terms: { x: 2, y: 1 }, constant: 6 },
  ] };
  const certificate = decoder.makeCertificate(original);
  const report = {
    original: decoder.decode(original),
    equivalent: verifier.verifyEquivalent(original, rowEquivalent),
    dependent: decoder.decode(dependent),
    inconsistent: decoder.decode(inconsistent),
    originalVerification: verifier.verifyCertificate(certificate, original),
    rowEquivalentVerification: verifier.verifyCertificate(certificate, rowEquivalent),
    eliminationVerification: verifier.verifyConclusions(original),
    certificate,
  };
  const output = path.join(__dirname, "equation_system_v0_1.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2), "utf8");
  console.log(`行变换等价：${report.equivalent.status}`);
  console.log(`原方程组：秩=${report.original.hypothesis.rank}，一致=${report.original.hypothesis.consistent}`);
  console.log(`依赖方程组：秩=${report.dependent.hypothesis.rank}，自由变量=${report.dependent.hypothesis.freeVariables.join(",")}`);
  console.log(`矛盾方程组：一致=${report.inconsistent.hypothesis.consistent}`);
  console.log(`已写入 ${output}`);
}

module.exports = { main };
if (require.main === module) main();
