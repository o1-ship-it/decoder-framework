// Transfer of a frozen composed decoder plan across related sequences.

const generator = require("./decoder_generator.js");
const failure = require("./decoder_failure_analysis.js");
const fs = require("node:fs");
const path = require("node:path");

function fib(length, first, second) {
  const values = [first, second];
  while (values.length < length) values.push(values.at(-1) + values.at(-2));
  return values;
}

function cumulative(values) {
  let total = 0;
  return values.map(value => { total += value; return total; });
}

function families(length = 24) {
  return {
    arithmetic: [
      Array.from({ length }, (_, i) => 3 + 4 * i),
      Array.from({ length }, (_, i) => -12 + 9 * i),
      Array.from({ length }, (_, i) => 50 - 2 * i),
    ],
    quadratic: [
      Array.from({ length }, (_, i) => i * i),
      Array.from({ length }, (_, i) => 2 * i * i + 3),
      Array.from({ length }, (_, i) => 5 * i * i - i),
    ],
    cumulativeFibonacci: [
      cumulative(fib(length, 1, 1)),
      cumulative(fib(length, 2, 1)),
      cumulative(fib(length, 3, 2)),
    ],
  };
}

function fitPlan(source) {
  const synthesis = generator.synthesize(source.slice(0, 16), [8, 10, 12], 2);
  if (synthesis.status !== "candidate_frozen") return null;
  const planName = synthesis.best.name;
  const plan = generator.candidates(2).find(decoder => decoder(source.slice(0, 12), 0).name === planName) || null;
  if (plan) plan.planName = planName;
  return plan;
}

function evaluate(plan, target, trainSize = 12, horizon = 4) {
  const train = target.slice(0, trainSize);
  const hidden = target.slice(trainSize, trainSize + horizon);
  const prediction = plan(train, horizon);
  const valid = prediction.valid && prediction.predicted.length === horizon;
  const error = valid ? prediction.predicted.reduce((sum, value, index) => sum + Math.abs(value - hidden[index]), 0) / horizon : Infinity;
  return { valid, exact: valid && error === 0, error, note: prediction.note };
}

function runFamily(family, variants) {
  const plan = fitPlan(variants[0]);
  if (!plan) return { family, status: "uncertain", plan: null, outcomes: [] };
  const outcomes = variants.map((target, variant) => ({ variant, ...evaluate(plan, target), diagnosis: failure.diagnose(plan, target) }));
  const sameStructureRate = outcomes.filter(outcome => outcome.exact).length / outcomes.length;
  return { family, status: sameStructureRate === 1 ? "transferred" : "partial", plan: plan.planName, outcomes, sameStructureRate };
}

function main() {
  const report = Object.fromEntries(Object.entries(families()).map(([family, variants]) => [family, runFamily(family, variants)]));
  for (const row of Object.values(report)) console.log(`${row.family}: ${row.status} ${row.plan || "—"}，同族精确率=${row.sameStructureRate?.toFixed(3) || "—"}`);
  const output = path.join(__dirname, "decoder_generated_transfer_v0_1.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2), "utf8");
  console.log(`已写入 ${output}`);
  return report;
}

module.exports = { families, fitPlan, evaluate, runFamily, main };
if (require.main === module) main();
