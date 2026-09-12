// Uniform, non-pooled reporting for heterogeneous decoder results.

function verificationStrength(result) {
  if (!result || result.verification === "no_certificate" || result.verification === "no_nontrivial_invariant" || String(result.verification).startsWith("uncertain")) return "unknown";
  if (result.verification === "counterexample_found" || result.residual > 0) return "refuted";
  if (String(result.verification).startsWith("verified")) return "verified";
  return "candidate";
}

function readability(result) {
  const human = typeof result?.representation === "string" || Array.isArray(result?.hypothesis);
  const machine = Boolean(result?.readability?.machine) || typeof result?.hypothesis === "object";
  return { human, machine };
}

function makeReport(results) {
  if (!Array.isArray(results)) throw new TypeError("报告输入必须是结果数组");
  const rows = results.map((result, index) => ({ index, domain: result?.domain || "unknown", status: result?.status || "unknown", verification: result?.verification || "unknown", verificationStrength: verificationStrength(result), residual: result?.residual ?? null, complexity: result?.complexity ?? null, readability: readability(result), evidenceScope: result?.evidenceScope || null }));
  const domains = [...new Set(rows.map(row => row.domain))];
  const summary = domains.map(domain => {
    const group = rows.filter(row => row.domain === domain); const verified = group.filter(row => row.verificationStrength === "verified").length; const refuted = group.filter(row => row.verificationStrength === "refuted").length;
    return { domain, total: group.length, verified, refuted, unknown: group.length - verified - refuted, verificationRate: verified / group.length, humanReadableRate: group.filter(row => row.readability.human).length / group.length, machineReadableRate: group.filter(row => row.readability.machine).length / group.length };
  });
  return { schemaVersion: 1, scope: "per_domain_decoder_results", rows, summary, limitation: "复杂度和可读性是协议字段上的代理指标，不构成跨领域总分" };
}

module.exports = { verificationStrength, readability, makeReport };
