// Bounded factor discovery for monic univariate integer polynomials.

const polynomial = require("./polynomial_decoder.js");

function divisors(value) {
  value = Math.abs(value);
  if (value === 0) return [0];
  const values = [];
  for (let i = 1; i * i <= value; i += 1) if (value % i === 0) { values.push(i); if (i * i !== value) values.push(value / i); }
  return [...new Set(values.flatMap(item => [item, -item]))];
}

function coefficients(input) {
  const normalized = polynomial.normalizePolynomial(input);
  const variables = new Set(normalized.terms.flatMap(term => Object.keys(term.powers)));
  if (variables.size > 1) throw new Error("因式分解器只处理单变量多项式");
  const variable = [...variables][0] || "x";
  const degree = Math.max(...normalized.terms.map(term => term.powers[variable] || 0));
  if (degree > 8) throw new Error("次数必须不超过 8");
  let values = Array(degree + 1).fill(0);
  for (const term of normalized.terms) values[term.powers[variable] || 0] = term.coefficient;
  if (![1, -1].includes(values[degree])) throw new Error("当前只处理首一多项式");
  const unit = values[degree];
  if (unit === -1) values = values.map(value => -value);
  return { variable, degree, values, unit };
}

function divideByRoot(values, root) {
  const degree = values.length - 1;
  const quotient = Array(degree).fill(0);
  quotient[0] = values[0];
  for (let index = 1; index < degree; index += 1) quotient[index] = values[index] + root * quotient[index - 1];
  const remainder = values[degree] + root * quotient[degree - 1];
  return { quotient, remainder };
}

function factor(input) {
  const data = coefficients(input);
  let values = data.values.slice();
  const roots = [];
  while (values.length > 1) {
    const candidates = divisors(values[0]);
    const root = candidates.find(candidate => divideByRoot(values.slice().reverse(), candidate).remainder === 0);
    if (root === undefined) break;
    roots.push(root);
    values = divideByRoot(values.slice().reverse(), root).quotient.reverse();
  }
  const factors = roots.map(root => ({ variable: data.variable, root }));
  if (values.length > 1) factors.push({ variable: data.variable, coefficients: values.slice().reverse() });
  return { variable: data.variable, originalDegree: data.degree, unit: data.unit, roots, residual: values.slice().reverse(), factors, complete: values.length === 1 };
}

function expand(factored) {
  let values = [factored.unit || 1];
  for (const factor of factored.factors) {
    const coefficientsFactor = factor.root !== undefined ? [-factor.root, 1] : factor.coefficients.slice();
    const next = Array(values.length + coefficientsFactor.length - 1).fill(0);
    for (let i = 0; i < values.length; i += 1) for (let j = 0; j < coefficientsFactor.length; j += 1) next[i + j] += values[i] * coefficientsFactor[j];
    values = next;
  }
  return values;
}

function decode(input) {
  const factored = factor(input);
  return { domain: "polynomial_factor", decoder: "integer_root_factorization", representation: `${factored.roots.map(root => `(x-${root})`).join("")} × residual`, hypothesis: factored, complexity: factored.factors.length, residual: factored.complete ? 0 : 1, verification: "factor_expansion_pending", limits: ["单变量首一整数多项式", "次数不超过 8", "只自动搜索整数根；不可约剩余因子会保留"] };
}

function makeCertificate(input) { const factored = factor(input); return { schemaVersion: 1, claim: "polynomial_factorization", source: polynomial.normalizePolynomial(input), factorization: factored, expansion: expand(factored), limits: decode(input).limits }; }

module.exports = { divisors, coefficients, divideByRoot, factor, expand, decode, makeCertificate };
