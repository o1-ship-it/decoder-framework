// Structural analysis for sparse integer multivariate polynomials.

const decoder = require("./polynomial_decoder.js");

function derivative(input, variable) {
  const normalized = decoder.normalizePolynomial(input);
  const terms = normalized.terms.map(term => {
    const power = term.powers[variable] || 0;
    if (!power) return null;
    const powers = { ...term.powers };
    if (power === 1) delete powers[variable]; else powers[variable] = power - 1;
    return { coefficient: term.coefficient * power, powers };
  }).filter(Boolean);
  return decoder.normalizePolynomial({ terms });
}

function multiplyScalar(input, scalar) {
  return decoder.normalizePolynomial({ terms: input.terms.map(term => ({ coefficient: term.coefficient * scalar, powers: term.powers })) });
}

function addPolynomials(inputs) {
  return decoder.normalizePolynomial({ terms: inputs.flatMap(input => input.terms) });
}

function analyze(input) {
  const normalized = decoder.normalizePolynomial(input);
  const variables = [...new Set(normalized.terms.flatMap(term => Object.keys(term.powers)))].sort();
  const totalDegrees = normalized.terms.map(term => Object.values(term.powers).reduce((sum, power) => sum + power, 0));
  const totalDegree = Math.max(...totalDegrees);
  const homogeneous = totalDegrees.every(degree => degree === totalDegree);
  const derivatives = Object.fromEntries(variables.map(variable => [variable, derivative(normalized, variable)]));
  const eulerLeft = addPolynomials(variables.map(variable => multiplyScalar({ terms: Object.entries(derivatives[variable].terms).map(([, term]) => term) }, 1)));
  // Build Σ x_i ∂P/∂x_i explicitly; variable multiplication restores each exponent.
  const eulerTerms = variables.flatMap(variable => derivatives[variable].terms.map(term => ({ coefficient: term.coefficient, powers: { ...term.powers, [variable]: (term.powers[variable] || 0) + 1 } })));
  const euler = decoder.normalizePolynomial({ terms: eulerTerms });
  const scaledOriginal = decoder.normalizePolynomial({ terms: normalized.terms.map(term => ({ coefficient: term.coefficient * totalDegree, powers: term.powers })) });
  const eulerIdentity = JSON.stringify(euler.terms) === JSON.stringify(scaledOriginal.terms);
  return { normalized, variables, totalDegree, homogeneous, derivatives, eulerIdentity, euler, scaledOriginal };
}

function decode(input) {
  const analysis = analyze(input);
  return { domain: "polynomial_analysis", decoder: "polynomial_invariant_analysis", representation: `degree=${analysis.totalDegree}; homogeneous=${analysis.homogeneous}`, hypothesis: analysis, complexity: analysis.normalized.terms.length + analysis.variables.length, residual: analysis.homogeneous && analysis.eulerIdentity ? 0 : 1, verification: "euler_identity_checked", limits: ["有限整数多项式", "齐次性按总次数定义", "欧拉恒等式仅在齐次情形作为结构证据"] };
}

function makeCertificate(input) { const analysis = analyze(input); return { schemaVersion: 1, claim: "polynomial_invariant_analysis", source: analysis.normalized, analysis, limits: decode(input).limits }; }

module.exports = { derivative, multiplyScalar, addPolynomials, analyze, decode, makeCertificate };
