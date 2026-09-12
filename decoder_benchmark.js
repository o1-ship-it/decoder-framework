// Minimal, dependency-free benchmark for the decoder theory.

function result(name, descriptionLength, predicted, valid, note, model = null) {
  return { name, descriptionLength, predicted, valid, note, model };
}

function constantDecoder(train, horizon) {
  if (train.length === 0 || !train.every(x => x === train[0])) {
    return result("constant", Infinity, [], false, "序列不恒定");
  }
  return result("constant", 1, Array(horizon).fill(train[0]), true, "常数", { kind: "constant", value: train[0] });
}

function arithmeticDecoder(train, horizon) {
  if (train.length < 2) {
    return result("arithmetic", Infinity, [], false, "需要至少两个样本");
  }
  const d = train[1] - train[0];
  for (let i = 2; i < train.length; i += 1) {
    if (train[i] - train[i - 1] !== d) {
      return result("arithmetic", Infinity, [], false, "差分不恒定");
    }
  }
  const predicted = Array.from({ length: horizon }, (_, i) => train[train.length - 1] + d * (i + 1));
  return result("arithmetic", 2, predicted, true, `公差=${d}`, { kind: "arithmetic", start: train[0], difference: d });
}

function periodicDecoder(train, horizon) {
  for (let period = 1; period <= Math.floor(train.length / 2); period += 1) {
    if (train.every((x, i) => x === train[i % period])) {
      const predicted = Array.from({ length: horizon }, (_, i) => train[(train.length + i) % period]);
      return result("periodic", period, predicted, true, `周期=${period}`, { kind: "periodic", pattern: train.slice(0, period) });
    }
  }
  return result("periodic", Infinity, [], false, "未发现稳定周期");
}

function polynomialDecoder(train, horizon) {
  // Newton forward extrapolation; it deliberately fits every observed prefix.
  const table = [train.slice()];
  while (table[table.length - 1].length > 1) {
    const previous = table[table.length - 1];
    table.push(previous.slice(0, -1).map((x, i) => previous[i + 1] - x));
  }
  const work = table.map(row => row[row.length - 1]);
  const predicted = [];
  for (let step = 0; step < horizon; step += 1) {
    predicted.push(work.reduce((sum, value) => sum + value, 0));
    for (let level = work.length - 1; level >= 1; level -= 1) work[level - 1] += work[level];
  }
  return result("polynomial", train.length, predicted, true, `插值次数上限=${train.length - 1}`, { kind: "finite_differences", coefficients: table.map(row => row[0]) });
}

function differenceDecoder(train, horizon) {
  // Accept only the lowest-order finite difference that is constant.
  let row = train.slice();
  for (let order = 0; order < train.length - 1; order += 1) {
    if (row.every(value => value === row[0])) {
      const work = [train.slice()];
      while (work[work.length - 1].length > 1) {
        const previous = work[work.length - 1];
        work.push(previous.slice(0, -1).map((x, i) => previous[i + 1] - x));
      }
      const levels = work.map(values => values[values.length - 1]);
      const predicted = [];
      for (let step = 0; step < horizon; step += 1) {
        for (let level = levels.length - 1; level >= 1; level -= 1) levels[level - 1] += levels[level];
        predicted.push(levels[0]);
      }
      return result("differences", order + 1, predicted, true, `恒定${order}阶差分`, { kind: "finite_differences", coefficients: work.slice(0, order + 1).map(row => row[0]) });
    }
    row = row.slice(0, -1).map((x, i) => row[i + 1] - x);
  }
  return result("differences", Infinity, [], false, "没有恒定的低阶差分");
}

function recurrenceDecoder(train, horizon) {
  // Search small integer second-order recurrences x_n=a*x_(n-1)+b*x_(n-2).
  if (train.length < 3) return result("recurrence", Infinity, [], false, "样本不足");
  for (let a = -5; a <= 5; a += 1) {
    for (let b = -5; b <= 5; b += 1) {
      let valid = true;
      for (let i = 2; i < train.length; i += 1) {
        if (train[i] !== a * train[i - 1] + b * train[i - 2]) { valid = false; break; }
      }
      if (valid) {
        const predicted = [];
        let x0 = train[train.length - 2];
        let x1 = train[train.length - 1];
        for (let i = 0; i < horizon; i += 1) {
          const next = a * x1 + b * x0;
          predicted.push(next);
          x0 = x1;
          x1 = next;
        }
        return result("recurrence", 4, predicted, true, `xₙ=${a}xₙ₋₁+(${b})xₙ₋₂`, { kind: "linear_recurrence", coefficients: [a, b], initial: train.slice(0, 2) });
      }
    }
  }
  return result("recurrence", Infinity, [], false, "未发现低阶整数递推");
}

const decoders = [constantDecoder, arithmeticDecoder, periodicDecoder, differenceDecoder, recurrenceDecoder, polynomialDecoder];

function error(predicted, expected) {
  if (predicted.length !== expected.length) return null;
  return predicted.reduce((sum, value, i) => sum + Math.abs(value - expected[i]), 0) / expected.length;
}

function runCase(name, sequence, trainSize = 6, horizon = 4) {
  const train = sequence.slice(0, trainSize);
  const hidden = sequence.slice(trainSize, trainSize + horizon);
  console.log(`\n${name}: 已知=${JSON.stringify(train)}, 隐藏=${JSON.stringify(hidden)}`);
  console.log("解码器        描述长度  平均预测误差  说明");
  for (const decoder of decoders) {
    const current = decoder(train, horizon);
    if (!current.valid) {
      console.log(`${current.name.padEnd(12)} ${"∞".padStart(8)} ${"—".padStart(12)}  ${current.note}`);
      continue;
    }
    const currentError = error(current.predicted, hidden);
    console.log(`${current.name.padEnd(12)} ${String(current.descriptionLength).padStart(8)} ${currentError.toPrecision(3).padStart(12)}  ${current.note}`);
  }
}

function main() {
  const cases = {
    "算术序列": Array.from({ length: 10 }, (_, i) => 3 + 4 * i),
    "周期序列": [1, 2, 3, 1, 2, 3, 1, 2, 3, 1],
    "二次序列": Array.from({ length: 10 }, (_, i) => i * i),
    "斐波那契序列": [1, 1, 2, 3, 5, 8, 13, 21, 34, 55],
    "随机序列": [7, 2, 9, 1, 8, 3, 0, 6, 4, 5],
  };
  for (const [name, sequence] of Object.entries(cases)) runCase(name, sequence);
}

if (require.main === module) main();

module.exports = {
  decoders,
  constantDecoder,
  arithmeticDecoder,
  periodicDecoder,
  differenceDecoder,
  recurrenceDecoder,
  polynomialDecoder,
};
