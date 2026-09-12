const assert = require("node:assert/strict");
const transfer = require("./decoder_transfer.js");
const base = require("./decoder_benchmark.js");
const adaptive = require("./decoder_adaptive.js");

const families = transfer.makeFamilies();
const checks = [
  ["arithmetic", base.arithmeticDecoder, families.arithmetic[1]],
  ["periodic", base.periodicDecoder, families.periodic[1]],
  ["differences", base.differenceDecoder, families.differences[1]],
  ["recurrence", base.recurrenceDecoder, families.recurrence[1]],
  ["difference→recurrence", adaptive.differenceRecurrenceDecoder, families.differenceRecurrence[1]],
];

for (const [name, decoder, sequence] of checks) {
  const outcome = transfer.evaluate(decoder, sequence);
  assert.equal(outcome.exact, true, `${name} 应迁移到同结构变体`);
}

// Structural classes can overlap: arithmetic is also x_n=2x_(n-1)-x_(n-2).
assert.equal(transfer.evaluate(base.recurrenceDecoder, families.arithmetic[0]).exact, true);
console.log("decoder_transfer_test: passed");
