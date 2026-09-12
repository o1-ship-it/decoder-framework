const assert = require("node:assert/strict");
const transfer = require("./decoder_generated_transfer.js");

for (const [family, variants] of Object.entries(transfer.families())) {
  const result = transfer.runFamily(family, variants);
  assert.equal(result.status, "transferred", `${family} 应可迁移`);
  assert.equal(result.sameStructureRate, 1);
  assert.ok(result.plan.includes("→"));
}

const families = transfer.families();
const plan = transfer.fitPlan(families.arithmetic[0]);
const unrelated = Array.from({ length: 24 }, (_, i) => (i * i + 3) % 17);
assert.equal(transfer.evaluate(plan, unrelated).exact, false);
console.log("decoder_generated_transfer_test: passed");
