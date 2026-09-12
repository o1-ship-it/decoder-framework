// Integer linear-equation decoder. An equation is sum(a_i*x_i) = constant.

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b !== 0) { const next = a % b; a = b; b = next; }
  return a;
}

function normalizeEquation(input) {
  if (!input || !input.terms || typeof input.terms !== "object" || !Number.isSafeInteger(input.constant)) throw new TypeError("方程格式无效");
  const terms = Object.entries(input.terms).filter(([, coefficient]) => coefficient !== 0).map(([variable, coefficient]) => {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(variable) || !Number.isSafeInteger(coefficient)) throw new TypeError("变量名或系数无效");
    return [variable, coefficient];
  }).sort(([left], [right]) => left.localeCompare(right));
  if (terms.length === 0) throw new Error("方程至少需要一个非零变量系数");
  let divisor = Math.abs(input.constant);
  for (const [, coefficient] of terms) divisor = gcd(divisor, coefficient);
  divisor = divisor || 1;
  let normalizedTerms = terms.map(([variable, coefficient]) => [variable, coefficient / divisor]);
  let normalizedConstant = input.constant / divisor;
  const first = normalizedTerms[0][1] || normalizedConstant;
  if (first < 0) {
    normalizedTerms = normalizedTerms.map(([variable, coefficient]) => [variable, -coefficient]);
    normalizedConstant = -normalizedConstant;
  }
  return { terms: Object.fromEntries(normalizedTerms), constant: normalizedConstant };
}

function unlabeledSignature(input) {
  const normalized = normalizeEquation(input);
  return JSON.stringify({ coefficients: Object.values(normalized.terms).sort((a, b) => a - b), constant: normalized.constant });
}

function renameVariables(input, mapping) {
  const normalized = normalizeEquation(input);
  const terms = {};
  for (const [variable, coefficient] of Object.entries(normalized.terms)) {
    const renamed = mapping[variable] || variable;
    terms[renamed] = (terms[renamed] || 0) + coefficient;
  }
  return normalizeEquation({ terms, constant: normalized.constant });
}

function decode(input) {
  const normalized = normalizeEquation(input);
  return {
    domain: "equation",
    decoder: "linear_normalization",
    representation: `${Object.entries(normalized.terms).map(([variable, coefficient]) => `${coefficient}${variable}`).join("+")}=${normalized.constant}`,
    hypothesis: normalized,
    complexity: Object.keys(normalized.terms).length + 1,
    residual: 0,
    verification: "normalized_exactly",
    limits: ["整数线性方程", "等价关系是整体非零整数倍和统一符号", "不处理非线性语义或实数域的额外解集差异"],
  };
}

function makeCertificate(input) {
  const normalized = normalizeEquation(input);
  return {
    schemaVersion: 1,
    claim: "linear_equation_normal_form",
    source: normalized,
    hypothesis: normalized,
    limits: decode(input).limits,
  };
}

module.exports = { gcd, normalizeEquation, unlabeledSignature, renameVariables, decode, makeCertificate };
