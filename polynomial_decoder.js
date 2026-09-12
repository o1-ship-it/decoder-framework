// Sparse integer polynomial normalization.

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const next = a % b; a = b; b = next; } return a; }
function monomialKey(powers) { return Object.entries(powers).filter(([, power]) => power !== 0).sort(([a], [b]) => a.localeCompare(b)).map(([variable, power]) => `${variable}^${power}`).join("*") || "1"; }

function normalizePolynomial(input) {
  if (!input || !Array.isArray(input.terms)) throw new TypeError("多项式必须包含 terms 数组");
  const combined = new Map();
  for (const [index, term] of input.terms.entries()) {
    if (!term || !Number.isSafeInteger(term.coefficient) || !term.powers || typeof term.powers !== "object") throw new TypeError(`第 ${index + 1} 项无效`);
    const powers = {};
    for (const [variable, power] of Object.entries(term.powers)) {
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(variable) || !Number.isSafeInteger(power) || power < 0) throw new TypeError("变量或幂次无效");
      if (power) powers[variable] = power;
    }
    const key = monomialKey(powers);
    combined.set(key, { coefficient: (combined.get(key)?.coefficient || 0) + term.coefficient, powers });
  }
  let terms = [...combined.values()].filter(term => term.coefficient !== 0);
  if (!terms.length) return { terms: [{ coefficient: 0, powers: {} }], content: 0 };
  let content = terms.reduce((value, term) => gcd(value, term.coefficient), 0) || 1;
  terms = terms.map(term => ({ coefficient: term.coefficient / content, powers: term.powers }));
  terms.sort((left, right) => monomialKey(left.powers).localeCompare(monomialKey(right.powers)));
  if (terms[0].coefficient < 0) terms = terms.map(term => ({ coefficient: -term.coefficient, powers: term.powers }));
  return { terms, content };
}

function signature(input) { return JSON.stringify(normalizePolynomial(input).terms); }
function decode(input) {
  const normalized = normalizePolynomial(input);
  return { domain: "polynomial", decoder: "sparse_polynomial_normalization", representation: normalized.terms.map(term => `${term.coefficient}[${monomialKey(term.powers)}]`).join(" + "), hypothesis: normalized, complexity: normalized.terms.length, residual: 0, verification: "normalized_exactly", limits: ["整数系数多项式", "变量交换和同类项合并视为表示变化", "不包含实数域语义或不等式解集"] };
}
function makeCertificate(input) { const normalized = normalizePolynomial(input); return { schemaVersion: 1, claim: "polynomial_normal_form", source: normalized, hypothesis: normalized, limits: decode(input).limits }; }

module.exports = { gcd, monomialKey, normalizePolynomial, signature, decode, makeCertificate };
