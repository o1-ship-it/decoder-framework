// Validation and execution helpers for the public decoder benchmark.

function validateCase(testCase) {
  if (!testCase || typeof testCase.id !== "string" || typeof testCase.domain !== "string") throw new TypeError("benchmark case 需要唯一 id 和 domain");
  if (!testCase.partitions || !Array.isArray(testCase.partitions.train) || !Array.isArray(testCase.partitions.test)) throw new TypeError("benchmark case 需要 train/test 分区");
  if (testCase.partitions.train.length === 0 || testCase.partitions.test.length === 0) throw new TypeError("train/test 分区不能为空");
  return true;
}

function validateBenchmark(benchmark) {
  if (!benchmark || benchmark.schemaVersion !== 1 || benchmark.claim !== "decoder_benchmark") throw new TypeError("benchmark 声明无效");
  const ids = new Set();
  for (const testCase of benchmark.cases || []) { validateCase(testCase); if (ids.has(testCase.id)) throw new Error("benchmark case id 必须唯一"); ids.add(testCase.id); }
  if (ids.size === 0) throw new Error("benchmark 不能为空");
  return { status: "valid_benchmark", caseCount: ids.size };
}

function summarize(results) {
  const total = results.length;
  return { total, verified: results.filter(result => result.verificationStrength === "verified").length, refuted: results.filter(result => result.verificationStrength === "refuted").length, unknown: results.filter(result => result.verificationStrength === "unknown").length, verificationRate: total ? results.filter(result => result.verificationStrength === "verified").length / total : null };
}

module.exports = { validateCase, validateBenchmark, summarize };
