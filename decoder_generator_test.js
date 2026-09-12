const assert = require("node:assert/strict");
const generator = require("./decoder_generator.js");

const arithmetic = Array.from({ length: 20 }, (_, i) => 3 + 4 * i);
const quadratic = Array.from({ length: 20 }, (_, i) => i * i);
const fib = [1, 1];
while (fib.length < 20) fib.push(fib.at(-1) + fib.at(-2));
let total = 0;
const cumulativeFib = fib.map(value => { total += value; return total; });
const random = [7, 2, 9, 1, 8, 3, 0, 6, 4, 5, 2, 8, 1, 9, 3, 7, 4, 0, 6, 5];

assert.equal(generator.synthesize(arithmetic).status, "candidate_frozen");
assert.equal(generator.synthesize(quadratic).best.name, "identity→differences");
assert.equal(generator.synthesize(cumulativeFib).best.name, "1阶差分→recurrence");
assert.equal(generator.synthesize(random).status, "uncertain");
const composed = generator.candidates(2).find(decoder => decoder(arithmetic.slice(0, 8), 2).name === "identity→arithmetic");
assert.deepEqual(composed(arithmetic.slice(0, 8), 2).predicted, [35, 39]);
console.log("decoder_generator_test: passed");
