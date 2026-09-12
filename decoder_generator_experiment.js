const fs = require("node:fs");
const path = require("node:path");
const generator = require("./decoder_generator.js");

function fib(length) {
  const values = [1, 1];
  while (values.length < length) values.push(values.at(-1) + values.at(-2));
  return values;
}

function cumulative(values) {
  let total = 0;
  return values.map(value => { total += value; return total; });
}

function main() {
  const cases = {
    arithmetic: Array.from({ length: 20 }, (_, i) => 3 + 4 * i),
    quadratic: Array.from({ length: 20 }, (_, i) => i * i),
    differenceRecurrence: cumulative(fib(20)),
    random: [7, 2, 9, 1, 8, 3, 0, 6, 4, 5, 2, 8, 1, 9, 3, 7, 4, 0, 6, 5],
  };
  const results = {};
  for (const [name, sequence] of Object.entries(cases)) {
    const synthesis = generator.synthesize(sequence, [8, 10, 12], 2);
    results[name] = {
      status: synthesis.status,
      best: synthesis.best && { name: synthesis.best.name, transformOrder: synthesis.best.transformOrder, exactRate: synthesis.best.exactRate, averageError: synthesis.best.averageError },
      top: synthesis.ranking.slice(0, 5).map(item => ({ name: item.name, exactRate: item.exactRate, averageError: item.averageError })),
    };
    console.log(`${name}: ${results[name].status} ${results[name].best?.name || "—"}`);
  }
  const output = path.join(__dirname, "decoder_generator_v0_1.json");
  fs.writeFileSync(output, JSON.stringify(results, null, 2), "utf8");
  console.log(`已写入 ${output}`);
}

module.exports = { main };
if (require.main === module) main();
