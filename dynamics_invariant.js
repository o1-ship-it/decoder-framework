// Bounded symbolic discovery of polynomial invariants for 2D maps.

function key(powers) { return `${powers[0]},${powers[1]}`; }
function clean(terms) { const out = new Map(); for (const term of terms) { if (!Number.isSafeInteger(term.coefficient) || term.coefficient === 0) continue; const k = key(term.powers); out.set(k, (out.get(k) || 0) + term.coefficient); } return [...out.entries()].filter(([, coefficient]) => coefficient !== 0).map(([encoded, coefficient]) => ({ coefficient, powers: encoded.split(",").map(Number) })); }
function add(...polynomials) { return clean(polynomials.flatMap(polynomial => polynomial)); }
function scale(polynomial, coefficient) { return clean(polynomial.map(term => ({ coefficient: term.coefficient * coefficient, powers: term.powers }))); }
function multiply(left, right) { return clean(left.flatMap(a => right.map(b => ({ coefficient: a.coefficient * b.coefficient, powers: [a.powers[0] + b.powers[0], a.powers[1] + b.powers[1]] })))); }
function power(polynomial, exponent) { let result = [{ coefficient: 1, powers: [0, 0] }]; for (let i = 0; i < exponent; i += 1) result = multiply(result, polynomial); return result; }
function monomial(powers, coefficient = 1) { return [{ coefficient, powers }]; }
function substitute(polynomial, map) { return add(...polynomial.map(term => scale(multiply(power(map.x, term.powers[0]), power(map.y, term.powers[1])), term.coefficient))); }
function equal(left, right) { const a = clean(left).sort((u, v) => key(u.powers).localeCompare(key(v.powers))); const b = clean(right).sort((u, v) => key(u.powers).localeCompare(key(v.powers))); return JSON.stringify(a) === JSON.stringify(b); }
function format(polynomial) { return clean(polynomial).sort((a, b) => b.powers[0] + b.powers[1] - a.powers[0] - a.powers[1]).map(term => `${term.coefficient}x^${term.powers[0]}y^${term.powers[1]}`).join(" + ") || "0"; }

function basis(maxDegree) {
  const result = [];
  for (let x = 0; x <= maxDegree; x += 1) for (let y = 0; y <= maxDegree - x; y += 1) result.push({ powers: [x, y], polynomial: monomial([x, y]) });
  return result;
}

function discover(map, maxDegree = 2, coefficientRange = 2) {
  if (!map?.x || !map?.y || !Number.isSafeInteger(maxDegree) || maxDegree < 1 || maxDegree > 3 || !Number.isSafeInteger(coefficientRange) || coefficientRange < 0 || coefficientRange > 3) throw new TypeError("需要二维多项式映射、1..3 次数和 0..3 系数范围");
  const terms = basis(maxDegree);
  const transformed = terms.map(term => substitute(term.polynomial, map));
  const differences = transformed.map((image, index) => add(image, scale(terms[index].polynomial, -1)));
  const candidates = [];
  function visit(index, coefficients, polynomial) {
    if (index === terms.length) {
      const nonConstant = polynomial.some(term => term.powers[0] + term.powers[1] > 0);
      if (coefficients.every(coefficient => coefficient === 0) || !nonConstant || !equal(substitute(polynomial, map), polynomial)) return;
      candidates.push({ coefficients: coefficients.slice(), polynomial, rule: format(polynomial) });
      return;
    }
    for (let coefficient = -coefficientRange; coefficient <= coefficientRange; coefficient += 1) visit(index + 1, [...coefficients, coefficient], add(polynomial, scale(terms[index].polynomial, coefficient)));
  }
  // Search combinations, pruning the zero constant and zero polynomial cases.
  visit(0, [], []);
  const unique = new Map();
  for (const candidate of candidates) unique.set(candidate.rule, candidate);
  const ranked = [...unique.values()].sort((left, right) => {
    const leftCost = left.polynomial.length + left.coefficients.reduce((sum, coefficient) => sum + Math.abs(coefficient), 0);
    const rightCost = right.polynomial.length + right.coefficients.reduce((sum, coefficient) => sum + Math.abs(coefficient), 0);
    return leftCost - rightCost || left.rule.localeCompare(right.rule);
  });
  return { map, maxDegree, coefficientRange, basis: terms.map(term => term.powers), invariants: ranked.slice(0, 100) };
}

function gcdBigInt(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { const t = a % b; a = b; b = t; } return a || 1n; }
function fraction(n, d = 1n) { if (d === 0n) throw new Error("分母不能为零"); if (d < 0n) { n = -n; d = -d; } const g = gcdBigInt(n, d); return { n: n / g, d: d / g }; }
function fAdd(a, b) { return fraction(a.n * b.d + b.n * a.d, a.d * b.d); }
function fNeg(a) { return { n: -a.n, d: a.d }; }
function fSub(a, b) { return fAdd(a, fNeg(b)); }
function fMul(a, b) { return fraction(a.n * b.n, a.d * b.d); }
function fDiv(a, b) { return fraction(a.n * b.d, a.d * b.n); }

function discoverLinear(map, maxDegree = 2) {
  if (!map?.x || !map?.y || !Number.isSafeInteger(maxDegree) || maxDegree < 1 || maxDegree > 4) throw new TypeError("需要二维多项式映射和 1..4 次数范围");
  const terms = basis(maxDegree);
  const differences = terms.map(term => add(substitute(term.polynomial, map), scale(term.polynomial, -1)));
  const exponents = [...new Set(differences.flatMap(polynomial => polynomial.map(term => key(term.powers))))].map(encoded => encoded.split(",").map(Number));
  const rows = exponents.map(powers => terms.map((_, column) => {
    const term = differences[column].find(item => item.powers[0] === powers[0] && item.powers[1] === powers[1]);
    return fraction(BigInt(term ? term.coefficient : 0));
  }));
  const rowCount = rows.length; const columnCount = terms.length; let pivotRow = 0; const pivots = [];
  for (let column = 0; column < columnCount && pivotRow < rowCount; column += 1) {
    let selected = pivotRow; while (selected < rowCount && rows[selected][column].n === 0n) selected += 1;
    if (selected === rowCount) continue;
    [rows[pivotRow], rows[selected]] = [rows[selected], rows[pivotRow]];
    const pivot = rows[pivotRow][column];
    rows[pivotRow] = rows[pivotRow].map(value => fDiv(value, pivot));
    for (let row = 0; row < rowCount; row += 1) if (row !== pivotRow && rows[row][column].n !== 0n) {
      const factor = rows[row][column];
      rows[row] = rows[row].map((value, index) => fSub(value, fMul(factor, rows[pivotRow][index])));
    }
    pivots.push(column); pivotRow += 1;
  }
  const pivotSet = new Set(pivots); const freeColumns = terms.map((_, index) => index).filter(index => !pivotSet.has(index));
  const candidates = [];
  for (const free of freeColumns) {
    const vector = Array.from({ length: columnCount }, () => fraction(0n)); vector[free] = fraction(1n);
    pivots.forEach((column, row) => { vector[column] = fNeg(rows[row][free]); });
    let lcm = 1n; for (const value of vector) lcm = (lcm / gcdBigInt(lcm, value.d)) * value.d;
    let integers = vector.map(value => value.n * (lcm / value.d));
    let divisor = 0n; for (const value of integers) divisor = gcdBigInt(divisor, value);
    integers = integers.map(value => value / divisor);
    const first = integers.find(value => value !== 0n); if (first < 0n) integers = integers.map(value => -value);
    const polynomial = clean(integers.map((coefficient, index) => ({ coefficient: Number(coefficient), powers: terms[index].powers }))).filter(term => term.powers[0] + term.powers[1] > 0);
    if (polynomial.length && equal(substitute(polynomial, map), polynomial)) candidates.push({ coefficients: integers.map(Number), polynomial, rule: format(polynomial) });
  }
  const unique = new Map(candidates.map(candidate => [candidate.rule, candidate]));
  return { map, maxDegree, method: "linear_nullspace", basis: terms.map(term => term.powers), invariants: [...unique.values()].sort((a, b) => a.rule.localeCompare(b.rule)) };
}

function verifyInvariant(invariant, map) {
  try { return equal(substitute(invariant.polynomial, map), invariant.polynomial); } catch { return false; }
}

function evaluate(polynomial, x, y) { return polynomial.reduce((sum, term) => sum + term.coefficient * x ** term.powers[0] * y ** term.powers[1], 0); }

function makeCertificate(map, maxDegree = 2, coefficientRange = 1, method = "enumeration") {
  if (method !== "enumeration" && method !== "linear_nullspace") throw new TypeError("未知动力系统发现方法");
  const result = method === "linear_nullspace" ? discoverLinear(map, maxDegree) : discover(map, maxDegree, coefficientRange);
  return { schemaVersion: 1, claim: "polynomial_dynamics_invariants", map, search: { maxDegree, coefficientRange, method }, representation: { audience: "machine", decoder: method, basisSize: result.basis.length, candidateCount: result.invariants.length }, invariants: result.invariants, limits: ["二维多项式映射", `次数≤${maxDegree}`, `系数范围≤${coefficientRange}`, `发现方法=${method}`, "搜索边界内未发现不变量不等于全空间不存在"] };
}

module.exports = { clean, add, scale, multiply, power, substitute, equal, format, basis, discover, discoverLinear, verifyInvariant, evaluate, makeCertificate };
