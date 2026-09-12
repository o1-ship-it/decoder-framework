const assert = require("node:assert/strict");
const search = require("./decoder_adaptive_search.js");

const arithmetic = Array.from({ length: 20 }, (_, i) => 3 + 4 * i);
const quadratic = Array.from({ length: 20 }, (_, i) => i * i);
const fib = [1, 1];
while (fib.length < 20) fib.push(fib.at(-1) + fib.at(-2));
let total = 0;
const cumulativeFib = fib.map(value => { total += value; return total; });
const random = [7, 2, 9, 1, 8, 3, 0, 6, 4, 5, 2, 8, 1, 9, 3, 7, 4, 0, 6, 5];

assert.equal(search.adaptiveSynthesize(arithmetic).selectedOrder, 0);
assert.equal(search.adaptiveSynthesize(quadratic).selectedOrder, 0);
assert.equal(search.adaptiveSynthesize(cumulativeFib).selectedOrder, 1);
const unknown = search.adaptiveSynthesize(random);
assert.equal(unknown.status, "uncertain");
assert.equal(unknown.selectedOrder, null);
assert.equal(unknown.rounds.length, 4);
console.log("decoder_adaptive_search_test: passed");
