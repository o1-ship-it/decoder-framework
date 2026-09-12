const fs = require("node:fs");
const path = require("node:path");
const base = require("./decoder_benchmark.js");
const adaptive = require("./decoder_adaptive.js");
const sequenceVerifier = require("./decoder_verifier.js");
const graph = require("./graph_decoder.js");
const graphExperiment = require("./graph_experiment.js");
const invariant = require("./graph_invariant_discovery.js");
const scoring = require("./decoder_evaluation.js");

function fib(length, first, second) {
  const values = [first, second];
  while (values.length < length) values.push(values.at(-1) + values.at(-2));
  return values.slice(0, length);
}

function cumulative(values) {
  let total = 0;
  return values.map(value => { total += value; return total; });
}

function families(length = 20) {
  return {
    arithmetic: Array.from({ length }, (_, i) => 3 + 4 * i),
    periodic: Array.from({ length }, (_, i) => [1, 2, 3][i % 3]),
    differences: Array.from({ length }, (_, i) => i * i),
    recurrence: fib(length, 1, 1),
    differenceRecurrence: cumulative(fib(length, 1, 1)),
  };
}

function targetFor(family, variant) {
  const length = 20;
  if (family === "arithmetic") return Array.from({ length }, (_, i) => -11 + (variant + 5) * i);
  if (family === "periodic") return Array.from({ length }, (_, i) => [4, 1, 4, 2][i % 4]);
  if (family === "differences") return Array.from({ length }, (_, i) => (variant + 2) * i * i + variant);
  if (family === "recurrence") return fib(length, variant + 2, variant + 1);
  if (family === "differenceRecurrence") return cumulative(fib(length, variant + 2, variant + 1));
  throw new Error(`未知序列族: ${family}`);
}

function sourceDecoders() {
  const result = {};
  for (const [family, sequence] of Object.entries(families())) {
    const ranking = adaptive.evaluateAcrossSplits(sequence.slice(0, 16), [8, 10, 12]);
    const winner = ranking.find(item => item.eligible);
    if (!winner) throw new Error(`源序列未找到解码器: ${family}`);
    if (family === "differenceRecurrence") result[family] = adaptive.differenceRecurrenceDecoder;
    else result[family] = base.decoders.find(decoder => decoder([1, 2, 4, 8, 16, 32], 1).name === winner.name);
    if (!result[family]) throw new Error(`无法载入解码器: ${winner.name}`);
  }
  return result;
}

function sequenceRecords(partition, shiftedCount) {
  const records = [];
  const sources = sourceDecoders();
  for (const family of Object.keys(families())) {
    const decoder = sources[family];
    for (let variant = 0; variant < 12; variant += 1) {
      const target = targetFor(family, variant);
      const shifted = variant < shiftedCount;
      if (shifted) for (let i = 8; i < target.length; i += 1) target[i] += 1;
      const development = target.slice(0, 8);
      const holdout = target.slice(8, 12);
      const prediction = decoder(development, holdout.length);
      const issued = prediction.valid && prediction.predicted.length === holdout.length && prediction.model;
      const record = {
        id: `sequence-${partition}-${family}-${variant}`,
        partition,
        domain: "sequence",
        claim: "exact_future_values",
        prediction: { issued: Boolean(issued), evidence: `${family}|${prediction.name || decoder.name}|protocol-v1` },
      };
      if (issued) {
        const expected = holdout.map((_, i) => sequenceVerifier.valueAt(prediction.model, development.length + i));
        record.outcome = { success: expected.every((value, i) => String(value) === String(holdout[i])) };
      }
      records.push(record);
    }
  }
  return records;
}

function permutation(size, offset) {
  return Array.from({ length: size }, (_, i) => (i + offset) % size);
}

function graphPair(index) {
  if (index % 4 === 0) {
    const source = graphExperiment.cycle(6);
    return [source, graphExperiment.relabel(source, permutation(6, index + 1))];
  }
  if (index % 4 === 1) {
    const source = graphExperiment.pathGraph(6);
    return [source, graphExperiment.relabel(source, permutation(6, index + 2))];
  }
  if (index % 4 === 2) {
    const source = graphExperiment.star(6);
    return [source, graphExperiment.relabel(source, permutation(6, index + 3))];
  }
  return [graphExperiment.cycle(6), { n: 6, edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3]] }];
}

function graphRecords(partition) {
  return Array.from({ length: 12 }, (_, index) => {
    const [left, right] = graphPair(index);
    const comparison = invariant.compare(left, right);
    const issued = comparison.sameInvariant;
    const record = {
      id: `graph-${partition}-${index}`,
      partition,
      domain: "graph",
      claim: "graph_isomorphism",
      prediction: { issued, evidence: `wl1-v2|n=${left.n}|signature-match` },
    };
    if (issued) record.outcome = { success: comparison.isomorphicForSmallGraph };
    return record;
  });
}

function main() {
  const calibration = [...sequenceRecords("calibration", 2), ...graphRecords("calibration")];
  const test = [...sequenceRecords("test", 2), ...graphRecords("test")];
  const stress = [...sequenceRecords("stress", 8), ...graphRecords("stress")];
  const calibrationModel = scoring.fitCalibration(calibration, 5);
  const report = {
    schemaVersion: 1,
    protocol: {
      calibration: "每个序列族 12 个变体，其中 2 个留出后缀改变；图对使用 12 个固定结构配对",
      test: "与 calibration 使用不同 id；只在最终评估读取 outcome",
      stress: "序列中 8/12 个变体改变留出后缀，用于观察分布变化",
      warning: "这是合成小样本的条件成功率，不是自然世界概率",
    },
    calibration: calibrationModel,
    test: scoring.evaluateRecords(test, calibrationModel),
    stress: scoring.evaluateRecords(stress, calibrationModel),
    recordCounts: { calibration: calibration.length, test: test.length, stress: stress.length },
  };
  const output = path.join(__dirname, "decoder_evaluation_v0_1.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2), "utf8");
  console.log(`校准记录=${calibration.length}，测试记录=${test.length}，压力记录=${stress.length}`);
  for (const row of report.test) console.log(`测试 ${row.domain}/${row.claim}: 覆盖率=${row.coverage.toFixed(3)}，命题成功率=${row.successRateAmongIssued?.toFixed(3) ?? "—"}`);
  for (const row of report.stress) console.log(`压力 ${row.domain}/${row.claim}: 覆盖率=${row.coverage.toFixed(3)}，命题成功率=${row.successRateAmongIssued?.toFixed(3) ?? "—"}`);
  console.log(`已写入 ${output}`);
}

module.exports = { main, sequenceRecords, graphRecords };
if (require.main === module) main();
