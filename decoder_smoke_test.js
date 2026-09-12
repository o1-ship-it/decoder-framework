const assert = require("node:assert/strict");
const adaptive = require("./decoder_adaptive.js");
const experiment = require("./decoder_experiment.js");
const { verifyCertificate } = require("./decoder_verifier.js");

const splitSizes = [8, 10, 12];
const developmentLength = 16;
const data = experiment.cases();

for (const [name, sequence] of Object.entries(data)) {
  const development = sequence.slice(0, developmentLength);
  const holdout = sequence.slice(developmentLength);
  const frozen = adaptive.createCertificate(development, holdout.length, splitSizes);
  if (name === "random") {
    assert.equal(frozen.certificate, null, "随机序列不应产生合格证书");
    continue;
  }
  assert.ok(frozen.certificate, `${name} 应产生证书`);
  assert.equal(frozen.certificate.claim, "finite_sample_hypothesis");
  const verification = verifyCertificate(frozen.certificate, development, holdout);
  if (name === "adversarial") {
    assert.equal(verification.status, "counterexample_found");
    assert.equal(verification.counterexample.term, 1);
  } else {
    assert.equal(verification.status, "verified_on_supplied_observations", name);
  }

  const tampered = JSON.parse(JSON.stringify(frozen.certificate));
  tampered.forecast[0] = String(BigInt(tampered.forecast[0]) + 1n);
  assert.equal(verifyCertificate(tampered, development, holdout).status, "invalid_certificate");
  const changedDevelopment = development.slice();
  changedDevelopment[0] += 1;
  assert.equal(verifyCertificate(frozen.certificate, changedDevelopment, holdout).status, "invalid_certificate");
}

console.log("decoder_smoke_test: passed");
