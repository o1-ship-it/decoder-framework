// Exact rational row reduction for small linear equation systems.

function gcd(a, b) {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b !== 0n) { const next = a % b; a = b; b = next; }
  return a;
}

function fraction(numerator, denominator = 1n) {
  if (denominator === 0n) throw new Error("分母不能为零");
  if (denominator < 0n) { numerator = -numerator; denominator = -denominator; }
  const divisor = gcd(numerator, denominator) || 1n;
  return { n: numerator / divisor, d: denominator / divisor };
}

const ZERO = () => fraction(0n);
function add(a, b) { return fraction(a.n * b.d + b.n * a.d, a.d * b.d); }
function sub(a, b) { return fraction(a.n * b.d - b.n * a.d, a.d * b.d); }
function mul(a, b) { return fraction(a.n * b.n, a.d * b.d); }
function div(a, b) { if (b.n === 0n) throw new Error("除零"); return fraction(a.n * b.d, a.d * b.n); }
function isZero(a) { return a.n === 0n; }
function parseInteger(value, label) {
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
  throw new TypeError(`${label} 不是整数`);
}
function serialize(value) { return value.d === 1n ? String(value.n) : `${value.n}/${value.d}`; }

function normalizeInput(system) {
  if (!system || !Array.isArray(system.equations) || system.equations.length === 0) throw new TypeError("方程组不能为空");
  const variables = [...new Set(system.equations.flatMap(equation => Object.keys(equation.terms || {})))].sort();
  if (variables.length === 0) throw new TypeError("方程组没有变量");
  const equations = system.equations.map((equation, row) => {
    if (!equation || !equation.terms || typeof equation.terms !== "object") throw new TypeError(`第 ${row + 1} 个方程无效`);
    return { coefficients: variables.map(variable => parseInteger(equation.terms[variable] || 0, `第 ${row + 1} 行 ${variable}`)), constant: parseInteger(equation.constant, `第 ${row + 1} 行常数`) };
  });
  return { variables, equations };
}

function rrefSystem(input, includeTrace = false) {
  const normalized = normalizeInput(input);
  const matrix = normalized.equations.map(equation => [...equation.coefficients.map(value => fraction(value)), fraction(equation.constant)]);
  const rowCount = matrix.length;
  const columnCount = normalized.variables.length;
  const pivots = [];
  const trace = [];
  let pivotRow = 0;
  for (let column = 0; column < columnCount && pivotRow < rowCount; column += 1) {
    let selected = pivotRow;
    while (selected < rowCount && isZero(matrix[selected][column])) selected += 1;
    if (selected === rowCount) continue;
    if (selected !== pivotRow) {
      [matrix[pivotRow], matrix[selected]] = [matrix[selected], matrix[pivotRow]];
      trace.push({ op: "swap", rowA: pivotRow, rowB: selected });
    }
    const pivot = matrix[pivotRow][column];
    const scale = div(fraction(1n), pivot);
    matrix[pivotRow] = matrix[pivotRow].map(value => div(value, pivot));
    trace.push({ op: "scale", row: pivotRow, factor: serialize(scale) });
    for (let row = 0; row < rowCount; row += 1) if (row !== pivotRow && !isZero(matrix[row][column])) {
      const factor = matrix[row][column];
      matrix[row] = matrix[row].map((value, index) => sub(value, mul(factor, matrix[pivotRow][index])));
      trace.push({ op: "add", target: row, source: pivotRow, factor: serialize(fraction(-factor.n, factor.d)) });
    }
    pivots.push(column);
    pivotRow += 1;
  }
  const serializedRows = matrix.map(row => row.map(serialize));
  const inconsistentRows = matrix.filter(row => row.slice(0, columnCount).every(isZero) && !isZero(row[columnCount]));
  const freeVariables = normalized.variables.filter((_, index) => !pivots.includes(index));
  const output = {
    variables: normalized.variables,
    rref: serializedRows,
    rank: pivots.length,
    pivots: pivots.map(index => normalized.variables[index]),
    freeVariables,
    consistent: inconsistentRows.length === 0,
  };
  if (includeTrace) output.trace = trace;
  return output;
}

function decode(input) {
  const normalized = rrefSystem(input);
  const conclusions = deriveConclusions(normalized);
  return {
    domain: "equation_system",
    decoder: "rational_row_reduction",
    representation: `RREF(${normalized.variables.join(",")})`,
    hypothesis: normalized,
    conclusions,
    complexity: normalized.rank * normalized.variables.length,
    residual: normalized.consistent ? 0 : 1,
    verification: "exact_rref",
    limits: ["整数系数的有限线性方程组", "解读在有理数域中进行", "RREF 等价不代表选择了唯一的应用语义"],
  };
}

function makeCertificate(input) {
  const source = rrefSystem(input);
  const normalizedInput = normalizeInput(input);
  const serialInput = { variables: normalizedInput.variables, equations: normalizedInput.equations.map(equation => ({ coefficients: equation.coefficients.map(String), constant: String(equation.constant) })) };
  return { schemaVersion: 2, claim: "linear_system_rref", input: serialInput, source, hypothesis: source, conclusions: deriveConclusions(source), trace: rrefSystem(input, true).trace, limits: decode(input).limits };
}

function deriveConclusions(reduced) {
  const columns = reduced.variables.length;
  const rows = reduced.rref;
  const conclusions = [];
  if (!reduced.consistent) return { status: "inconsistent", statements: [] };
  for (let row = 0; row < rows.length; row += 1) {
    const values = rows[row];
    const pivot = reduced.pivots.findIndex(variable => {
      const column = reduced.variables.indexOf(variable);
      return values[column] === "1" && values.slice(0, column).every(value => value === "0");
    });
    if (pivot < 0) continue;
    const pivotVariable = reduced.pivots[pivot];
    const terms = [];
    for (let column = 0; column < columns; column += 1) {
      if (column === reduced.variables.indexOf(pivotVariable)) continue;
      const coefficient = values[column];
      if (coefficient !== "0") terms.push({ variable: reduced.variables[column], coefficient: coefficient.startsWith("-") ? coefficient.slice(1) : `-${coefficient}` });
    }
    conclusions.push({ variable: pivotVariable, equals: { constant: values[columns], terms } });
  }
  return { status: "consistent", unique: reduced.freeVariables.length === 0, statements: conclusions };
}

module.exports = { fraction, serialize, normalizeInput, rrefSystem, deriveConclusions, decode, makeCertificate };
