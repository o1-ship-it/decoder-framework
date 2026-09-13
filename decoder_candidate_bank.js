// Complete, finite version space for the sequence families used by v2.3.
// The learner may rank this space, but it never silently discards tied models.

function validate(values, name, min = 1) {
  if (!Array.isArray(values) || values.length < min || !values.every(Number.isSafeInteger)) throw new TypeError(`${name}需要至少${min}个安全整数`);
}
function key(model) { return `${model.family}:${JSON.stringify(model.parameters)}`; }
function toBig(value) { return BigInt(value); }
function predict(model, seed, count) {
  const values = seed.map(toBig); const out = [];
  for (let i = 0; i < count; i += 1) {
    let next;
    next = step(model, values);
    values.push(next); out.push(next.toString());
  }
  return out;
}
function step(model, values) {
  if (model.family === "arithmetic") return values.at(-1) + toBig(model.parameters.difference);
  if (model.family === "periodic") return values.at(-model.parameters.period);
  if (model.family === "affine") return toBig(model.parameters.multiplier) * values.at(-1) + toBig(model.parameters.offset);
  if (model.family === "modular_affine") { const m = toBig(model.parameters.modulus); let next = (toBig(model.parameters.multiplier) * values.at(-1) + toBig(model.parameters.offset)) % m; if (next < 0n) next += m; return next; }
  throw new TypeError(`不支持的候选族: ${model.family}`);
}
function fits(model, observed) { const values = observed.slice(0, 1).map(toBig); for (let index = 1; index < observed.length; index += 1) { const next = step(model, values); if (next !== toBig(observed[index])) return false; values.push(next); } return true; }

function enumerate(observed, options = {}) {
  validate(observed, "观测序列", 6);
  const maxPeriod = options.maxPeriod ?? 8; const coefficientRange = options.coefficientRange ?? 8; const minModulus = options.minModulus ?? 2; const maxModulus = options.maxModulus ?? 32;
  if (![maxPeriod, coefficientRange, minModulus, maxModulus].every(Number.isSafeInteger) || minModulus < 2 || maxModulus < minModulus || maxModulus > 128) throw new RangeError("候选空间边界无效");
  const candidates = []; const add = model => { if (fits(model, observed)) candidates.push({ id: key(model), family: model.family, parameters: model.parameters }); };
  add({ family: "arithmetic", parameters: { difference: (BigInt(observed[1]) - BigInt(observed[0])).toString() } });
  for (let period = 1; period <= Math.min(maxPeriod, Math.floor(observed.length / 2)); period += 1) add({ family: "periodic", parameters: { period } });
  for (let a = -coefficientRange; a <= coefficientRange; a += 1) for (let b = -coefficientRange; b <= coefficientRange; b += 1) add({ family: "affine", parameters: { multiplier: String(a), offset: String(b) } });
  for (let modulus = minModulus; modulus <= maxModulus; modulus += 1) for (let a = 0; a < modulus; a += 1) for (let b = 0; b < modulus; b += 1) add({ family: "modular_affine", parameters: { modulus, multiplier: a, offset: b } });
  const unique = new Map(candidates.map(model => [model.id, model]));
  return [...unique.values()].sort((a, b) => a.id.localeCompare(b.id));
}
module.exports = { enumerate, predict, fits, key, validate };
