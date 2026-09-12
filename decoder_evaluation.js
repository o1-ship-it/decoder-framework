// Shared accounting for explicitly named claims. No pooled cross-domain score.
// A smoothed empirical table is fitted on calibration records only.

function keyOf(record) {
  return JSON.stringify([record.domain, record.claim, record.prediction.evidence]);
}

function validateRecords(records) {
  const ids = new Set();
  for (const record of records) {
    if (!record || typeof record.id !== "string" || ids.has(record.id)) throw new Error("记录 id 必须唯一");
    ids.add(record.id);
    if (typeof record.domain !== "string" || typeof record.claim !== "string" || typeof record.prediction?.issued !== "boolean") throw new Error("缺少命题或预测状态");
    if (record.prediction.issued && (typeof record.prediction.evidence !== "string" || typeof record.outcome?.success !== "boolean")) throw new Error("已提出的命题必须有独立验证结果");
  }
}

function fitCalibration(records, minCount = 5) {
  validateRecords(records);
  if (!Number.isSafeInteger(minCount) || minCount < 1) throw new RangeError("最小校准样本数无效");
  if (records.some(record => record.partition !== "calibration")) throw new Error("只允许用 calibration 分区拟合概率");
  const buckets = {};
  for (const record of records) {
    if (!record.prediction.issued) continue;
    const key = keyOf(record);
    buckets[key] ||= { count: 0, successes: 0 };
    buckets[key].count += 1;
    buckets[key].successes += Number(record.outcome.success);
  }
  for (const bucket of Object.values(buckets)) bucket.probability = bucket.count >= minCount
    ? (bucket.successes + 1) / (bucket.count + 2) : null;
  return {
    schemaVersion: 1,
    method: "bucket_empirical_rate_with_Beta_1_1_smoothing",
    minCount,
    calibrationIds: records.map(record => record.id),
    buckets,
    limitation: "概率只估计本实验样本混合下的命题成功率；未保证分布变化后的可靠性",
  };
}

function confidenceFor(record, calibration) {
  // Deliberately reads only pre-verification fields; outcomes are not inputs.
  if (!record.prediction.issued) return { probability: null, reason: "abstained" };
  const bucket = calibration.buckets[keyOf(record)];
  if (!bucket || bucket.probability === null) return { probability: null, reason: "insufficient_calibration_data" };
  return { probability: bucket.probability, calibrationCount: bucket.count, reason: "empirical_estimate" };
}

function average(values) { return values.length ? values.reduce((sum, x) => sum + x, 0) / values.length : null; }

function evaluateRecords(records, calibration) {
  validateRecords(records);
  const seen = new Set(calibration.calibrationIds);
  if (records.some(record => seen.has(record.id) || record.partition === "calibration")) throw new Error("测试记录不能重用校准记录");
  const groups = new Map();
  for (const record of records) {
    const key = JSON.stringify([record.domain, record.claim]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...record, confidence: confidenceFor(record, calibration) });
  }
  return [...groups.values()].map(rows => {
    const issued = rows.filter(row => row.prediction.issued);
    const scored = issued.filter(row => row.confidence.probability !== null);
    const successes = issued.filter(row => row.outcome.success).length;
    const reliability = new Map();
    for (const row of scored) {
      const p = row.confidence.probability;
      if (!reliability.has(p)) reliability.set(p, []);
      reliability.get(p).push(Number(row.outcome.success));
    }
    return {
      domain: rows[0].domain,
      claim: rows[0].claim,
      total: rows.length,
      issued: issued.length,
      abstained: rows.length - issued.length,
      successes,
      coverage: issued.length / rows.length,
      successRateAmongIssued: issued.length ? successes / issued.length : null,
      probabilityCount: scored.length,
      brierScore: average(scored.map(row => (row.confidence.probability - Number(row.outcome.success)) ** 2)),
      certaintyBaselineBrier: average(scored.map(row => (1 - Number(row.outcome.success)) ** 2)),
      reliability: [...reliability].map(([probability, outcomes]) => ({ probability, count: outcomes.length, observedSuccessRate: average(outcomes) })),
      riskCoverage: [0, 0.6, 0.8, 0.9].map(threshold => {
        const selected = scored.filter(row => row.confidence.probability >= threshold);
        return { threshold, count: selected.length, coverage: selected.length / rows.length, errorRate: average(selected.map(row => Number(!row.outcome.success))) };
      }),
    };
  });
}

module.exports = { fitCalibration, confidenceFor, evaluateRecords };
