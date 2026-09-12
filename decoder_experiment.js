// End-to-end experiment: freeze a certificate before checking a final holdout.

const fs = require("node:fs");
const path = require("node:path");
const adaptive = require("./decoder_adaptive.js");
const { verifyCertificate } = require("./decoder_verifier.js");

function fibonacci(length) {
  const values = [1, 1];
  while (values.length < length) values.push(values.at(-1) + values.at(-2));
  return values.slice(0, length);
}

function cumulative(values) {
  let total = 0;
  return values.map(value => { total += value; return total; });
}

function lcg(length) {
  let state = 17;
  return Array.from({ length }, () => {
    state = (state * 73 + 19) % 101;
    return state;
  });
}

function cases() {
  const length = 20;
  const arithmetic = Array.from({ length }, (_, i) => 3 + 4 * i);
  const periodic = Array.from({ length }, (_, i) => [1, 2, 3][i % 3]);
  const quadratic = Array.from({ length }, (_, i) => i * i);
  const fib = fibonacci(length);
  const differenceRecurrence = cumulative(fibonacci(length));
  const adversarial = arithmetic.slice();
  adversarial[16] += 1;
  adversarial[17] += 1;
  adversarial[18] += 1;
  adversarial[19] += 1;
  return { arithmetic, periodic, quadratic, fibonacci: fib, differenceRecurrence, random: lcg(length), adversarial };
}

function main() {
  const allCases = cases();
  const developmentLength = 16;
  const splitSizes = [8, 10, 12];
  const report = { schemaVersion: 2, protocol: { developmentLength, splitSizes, holdoutStartTerm: developmentLength + 1 }, cases: {} };
  for (const [name, sequence] of Object.entries(allCases)) {
    const development = sequence.slice(0, developmentLength);
    const holdout = sequence.slice(developmentLength);
    const frozen = adaptive.createCertificate(development, holdout.length, splitSizes);
    const verification = frozen.certificate
      ? verifyCertificate(frozen.certificate, development, holdout)
      : { status: "no_certificate", reason: frozen.reason || "开发数据未产生合格候选" };
    report.cases[name] = {
      development,
      holdout,
      selection: frozen.ranking.slice(0, 3).map(item => ({ name: item.name, score: item.score, passRate: item.passRate, eligible: item.eligible })),
      certificate: frozen.certificate,
      verification,
    };
    console.log(`${name}: ${frozen.certificate ? frozen.certificate.decoder : "不确定"} → ${verification.status}`);
    if (verification.counterexample) console.log(`  第 ${verification.counterexample.term} 项出现反例`);
  }
  const output = path.join(__dirname, "decoder_certificates_v0_2.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2), "utf8");
  console.log(`已写入 ${output}`);
}

module.exports = { main, cases };
if (require.main === module) main();
