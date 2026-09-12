const assert = require("node:assert/strict");
const schema = require("./benchmark_schema.js");
const benchmark = { schemaVersion: 1, claim: "decoder_benchmark", cases: [{ id: "x", domain: "sequence", partitions: { train: [1], test: [2] } }] };
assert.deepEqual(schema.validateBenchmark(benchmark), { status: "valid_benchmark", caseCount: 1 });
assert.throws(() => schema.validateBenchmark({ ...benchmark, cases: [{ ...benchmark.cases[0], id: "x" }, { ...benchmark.cases[0], id: "x" }] }), /唯一/);
assert.deepEqual(schema.summarize([{ verificationStrength: "verified" }, { verificationStrength: "unknown" }]), { total: 2, verified: 1, refuted: 0, unknown: 1, verificationRate: 0.5 });
console.log("benchmark_schema_test: passed");
