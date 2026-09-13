// v2.0 capability evaluation for hidden-structure decoders.
// Calibration records are used only to estimate empirical behavior;
// test records remain independent and are never used for selection.

const crypto = require("node:crypto");
const competition = require("./decoder_hidden_competition.js");

const EXPECTED = new Set(["verified_unique_hidden_structure", "ambiguous_hidden_structure", "uncertain_hidden_structure"]);

function validateTask(task) {
  if (!task || typeof task.id !== "string" || !Array.isArray(task.train) || !Array.isArray(task.test) || !Array.isArray(task.stress)) throw new TypeError("能力任务需要 id、train、test 和 stress");
  if (task.train.length < 6 || task.test.length < 1 || !task.train.every(Number.isSafeInteger) || !task.test.every(Number.isSafeInteger) || !task.stress.every(Number.isSafeInteger)) throw new TypeError("能力任务序列必须是足够长的安全整数数组");
  if (task.partition && task.partition !== "calibration" && task.partition !== "test") throw new TypeError("partition 必须是 calibration 或 test");
}

function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(value, (key, item) => key === "elapsedMs" ? undefined : item)).digest("hex"); }

function evaluateTask(task, options = {}) {
  validateTask(task);
  const started = process.hrtime.bigint();
  const result = competition.compete(task.train, task.test, task.stress, { ...options, ...(task.options || {}) });
  const confidence = result.status === "verified_unique_hidden_structure" ? 1 : result.status === "ambiguous_hidden_structure" ? 0.5 : 0;
  return { id: task.id, partition: task.partition || "test", expected: task.expected || null, actual: result.status, confidence, candidateCount: result.exactCandidateCount, stressResidualMax: result.candidates[0]?.stressResidualMax ?? null, elapsedMs: Number(process.hrtime.bigint() - started) / 1e6 };
}

function summarize(rows) {
  const total = rows.length;
  const verified = rows.filter(row => row.actual === "verified_unique_hidden_structure");
  const issued = rows.filter(row => row.confidence > 0);
  const correct = rows.filter(row => row.expected && row.expected === row.actual);
  const brier = rows.length ? rows.reduce((sum, row) => sum + (row.confidence - Number(row.actual === "verified_unique_hidden_structure")) ** 2, 0) / rows.length : null;
  return { total, verified: verified.length, ambiguous: rows.filter(row => row.actual === "ambiguous_hidden_structure").length, uncertain: rows.filter(row => row.actual === "uncertain_hidden_structure").length, coverage: total ? issued.length / total : null, selectiveRisk: issued.length ? 1 - correct.filter(row => row.confidence > 0).length / issued.length : null, exactLabelRate: rows.filter(row => row.expected).length ? correct.length / rows.filter(row => row.expected).length : null, brierScore: brier };
}

function runMatrix(tasks, options = {}) {
  if (!Array.isArray(tasks) || tasks.length === 0) throw new TypeError("能力矩阵不能为空");
  const ids = new Set();
  for (const task of tasks) { validateTask(task); if (ids.has(task.id)) throw new Error("能力任务 id 必须唯一"); ids.add(task.id); }
  const calibrationTasks = tasks.filter(task => task.partition === "calibration");
  const testTasks = tasks.filter(task => task.partition !== "calibration");
  const calibration = calibrationTasks.map(task => evaluateTask(task, options));
  const test = testTasks.map(task => evaluateTask(task, options));
  return { schemaVersion: 1, claim: "decoder_capability_matrix", taskDigest: digest(tasks), calibration: { rows: calibration, summary: summarize(calibration) }, test: { rows: test, summary: summarize(test) }, limits: ["能力分数只适用于声明的候选族和任务生成分布", "confidence 是状态映射，不是概率定理", "test 任务未用于候选选择"] };
}

function makeCertificate(tasks, options = {}) { return { schemaVersion: 1, claim: "decoder_capability_matrix", tasks, options, result: runMatrix(tasks, options) }; }
function verifyCertificate(certificate) {
  try {
    if (!certificate || certificate.schemaVersion !== 1 || certificate.claim !== "decoder_capability_matrix") return { status: "invalid_certificate" };
    const replay = runMatrix(certificate.tasks, certificate.options);
    return digest(replay) === digest(certificate.result) ? { status: "verified_capability_matrix", test: replay.test.summary } : { status: "invalid_certificate", reason: "能力矩阵无法重放" };
  } catch (error) { return { status: "invalid_certificate", reason: error.message }; }
}

module.exports = { validateTask, evaluateTask, summarize, runMatrix, makeCertificate, verifyCertificate };
