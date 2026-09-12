// Feedback layer for decoder_benchmark.js.
// It scores candidate decoders after hidden data becomes available and decides
// whether to keep a structure or report uncertainty.

const benchmark = require("./decoder_benchmark.js");

function meanAbsoluteError(predicted, expected) {
  if (predicted.length !== expected.length || expected.length === 0) return Infinity;
  return predicted.reduce((sum, value, i) => sum + Math.abs(value - expected[i]), 0) / expected.length;
}

function classify(candidate) {
  if (!candidate.valid) {
    if (candidate.name === "arithmetic" || candidate.name === "differences") return "差分表示不匹配";
    if (candidate.name === "periodic") return "周期表示不匹配";
    if (candidate.name === "recurrence") return "递推表示不匹配";
    return "表示不匹配";
  }
  if (candidate.error > 2) return "拟合成功但外推失败（疑似过拟合）";
  return "通过验证";
}

function suggestNext(candidates) {
  const failures = candidates.filter(candidate => candidate.status !== "通过验证").map(candidate => candidate.status);
  if (failures.some(status => status.includes("过拟合"))) {
    return "提高验证长度，尝试更简单的表示，并保留不确定性";
  }
  if (failures.some(status => status.includes("差分"))) {
    return "尝试递推、周期或频率表示";
  }
  if (failures.some(status => status.includes("周期"))) {
    return "尝试差分或递推表示";
  }
  if (failures.some(status => status.includes("递推"))) {
    return "尝试更高阶递推或重新编码变量";
  }
  return "增加数据或更换表示方式";
}

function evaluate(train, hidden) {
  const allCandidates = benchmark.decoders
    .map(decoder => decoder(train, hidden.length))
    .map(candidate => {
      const candidateError = candidate.valid ? meanAbsoluteError(candidate.predicted, hidden) : Infinity;
      return {
        ...candidate,
        error: candidateError,
        score: candidate.descriptionLength + 10 * candidateError,
        status: classify({ ...candidate, error: candidateError }),
      };
    });
  const candidates = allCandidates.filter(candidate => candidate.valid)
    .sort((a, b) => a.score - b.score);

  if (candidates.length === 0 || candidates[0].error > 2) {
    return { status: "uncertain", candidates, allCandidates, suggestion: suggestNext(allCandidates) };
  }
  return { status: "accepted", winner: candidates[0], candidates, allCandidates, suggestion: suggestNext(allCandidates) };
}

function main() {
  const cases = {
    算术序列: [3, 7, 11, 15, 19, 23, 27, 31, 35, 39],
    周期序列: [1, 2, 3, 1, 2, 3, 1, 2, 3, 1],
    二次序列: [0, 1, 4, 9, 16, 25, 36, 49, 64, 81],
    斐波那契序列: [1, 1, 2, 3, 5, 8, 13, 21, 34, 55],
    随机序列: [7, 2, 9, 1, 8, 3, 0, 6, 4, 5],
  };
  for (const [name, sequence] of Object.entries(cases)) {
    const feedback = evaluate(sequence.slice(0, 6), sequence.slice(6));
    if (feedback.status === "accepted") {
      console.log(`${name}: 接受 ${feedback.winner.name}，评分=${feedback.winner.score.toFixed(3)}，误差=${feedback.winner.error.toFixed(3)}`);
    } else {
      console.log(`${name}: 不确定，需要更新解码器；建议：${feedback.suggestion}`);
    }
    console.log(`  诊断：${feedback.allCandidates.map(candidate => `${candidate.name}=${candidate.status}`).join("；")}`);
  }
}

main();

module.exports = { evaluate };
