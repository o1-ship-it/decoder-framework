const fs = require("node:fs");
const path = require("node:path");
const search = require("./decoder_adaptive_search.js");

function main() {
  const fib = [1, 1];
  while (fib.length < 20) fib.push(fib.at(-1) + fib.at(-2));
  let total = 0;
  const cumulativeFib = fib.map(value => { total += value; return total; });
  const cases = {
    arithmetic: Array.from({ length: 20 }, (_, i) => 3 + 4 * i),
    quadratic: Array.from({ length: 20 }, (_, i) => i * i),
    cumulativeFib,
    random: [7, 2, 9, 1, 8, 3, 0, 6, 4, 5, 2, 8, 1, 9, 3, 7, 4, 0, 6, 5],
  };
  const report = Object.fromEntries(Object.entries(cases).map(([name, sequence]) => [name, search.adaptiveSynthesize(sequence)]));
  const output = path.join(__dirname, "decoder_adaptive_search_v0_1.json");
  fs.writeFileSync(output, JSON.stringify(report, null, 2), "utf8");
  for (const [name, result] of Object.entries(report)) console.log(`${name}: ${result.status}，选定阶数=${result.selectedOrder ?? "—"}`);
  console.log(`已写入 ${output}`);
}

module.exports = { main };
if (require.main === module) main();
