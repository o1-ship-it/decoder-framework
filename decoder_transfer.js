// Transfer evaluation: a decoder family is refit on a related target sequence.

const fs = require("node:fs");
const path = require("node:path");
const base = require("./decoder_benchmark.js");
const adaptive = require("./decoder_adaptive.js");

function fib(length, first = 1, second = 1) {
  const values = [first, second];
  while (values.length < length) values.push(values.at(-1) + values.at(-2));
  return values.slice(0, length);
}

function cumulative(values) {
  let total = 0;
  return values.map(value => { total += value; return total; });
}

function makeFamilies(length = 20) {
  return {
    arithmetic: [
      Array.from({ length }, (_, i) => 3 + 4 * i),
      Array.from({ length }, (_, i) => -8 + 7 * i),
    ],
    periodic: [
      Array.from({ length }, (_, i) => [1, 2, 3][i % 3]),
      Array.from({ length }, (_, i) => [4, 4, 1, 4, 4, 1][i % 6]),
    ],
    differences: [
      Array.from({ length }, (_, i) => i * i),
      Array.from({ length }, (_, i) => 2 * i * i + 3),
    ],
    recurrence: [fib(length, 1, 1), fib(length, 2, 1)],
    differenceRecurrence: [cumulative(fib(length, 1, 1)), cumulative(fib(length, 2, 1))],
  };
}

function decoderFor(name) {
  const direct = base.decoders.find(decoder => decoder([1, 2, 4, 8, 16, 32], 1).name === name);
  if (direct) return direct;
  if (name === "difference→recurrence") return adaptive.differenceRecurrenceDecoder;
  throw new Error(`未找到解码器家族: ${name}`);
}

function evaluate(decoder, sequence, trainSize = 8, horizon = 4) {
  const train = sequence.slice(0, trainSize);
  const hidden = sequence.slice(trainSize, trainSize + horizon);
  const prediction = decoder(train, horizon);
  const valid = prediction.valid && prediction.predicted.length === hidden.length;
  const error = valid ? prediction.predicted.reduce((sum, value, i) => sum + Math.abs(value - hidden[i]), 0) / hidden.length : Infinity;
  return { valid, exact: valid && error === 0, error, note: prediction.note };
}

function main() {
  const families = makeFamilies();
  const sourceSummary = {};
  const transfer = [];
  for (const [family, variants] of Object.entries(families)) {
    const source = variants[0];
    const ranking = adaptive.evaluateAcrossSplits(source.slice(0, 16), [8, 10, 12]);
    const selected = ranking.find(item => item.eligible);
    sourceSummary[family] = selected ? selected.name : null;
    if (!selected) continue;
    const decoder = decoderFor(selected.name);
    for (const [targetFamily, targets] of Object.entries(families)) {
      for (let variant = 0; variant < targets.length; variant += 1) {
        const outcome = evaluate(decoder, targets[variant]);
        transfer.push({ sourceFamily: family, targetFamily, variant, decoder: selected.name, ...outcome });
      }
    }
  }
  // Variant zero was used for source selection; it is not a transfer test.
  const sameFamily = transfer.filter(row => row.sourceFamily === row.targetFamily && row.variant > 0);
  const crossFamily = transfer.filter(row => row.sourceFamily !== row.targetFamily);
  const report = {
    schemaVersion: 1,
    protocol: { trainSize: 8, holdoutLength: 4, sourceSelectionSplits: [8, 10, 12] },
    sourceSummary,
    metrics: {
      sameFamilyExactRate: sameFamily.filter(row => row.exact).length / sameFamily.length,
      crossFamilyExactRate: crossFamily.filter(row => row.exact).length / crossFamily.length,
      sameFamilyCount: sameFamily.length,
      crossFamilyCount: crossFamily.length,
    },
    transfer,
  };
  const output = path.join(__dirname, "decoder_transfer_v0_1.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2), "utf8");
  console.log(`同结构迁移精确率=${report.metrics.sameFamilyExactRate.toFixed(3)}，跨结构重叠率=${report.metrics.crossFamilyExactRate.toFixed(3)}`);
  console.log(`已写入 ${output}`);
}

module.exports = { makeFamilies, decoderFor, evaluate };
if (require.main === module) main();
