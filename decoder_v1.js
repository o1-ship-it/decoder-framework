// Public v1.0 entry point for the decoder framework.

const protocol = require("./decoder_protocol.js");

const DOMAINS = new Set(["sequence", "generated_sequence", "graph", "equation", "equation_system", "polynomial", "polynomial_factor", "polynomial_analysis", "dynamics", "dynamics_parameterized", "noisy_sequence", "dynamics_condition_multivariate", "machine_representation", "machine_decoder_search", "hidden_sequence", "hidden_sequence_competition", "capability_matrix", "hidden_identifiability", "active_observation_design", "noisy_active_observation_design", "observational_equivalence"]);

function decodeObject(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("输入必须是对象");
  if (!DOMAINS.has(input.domain)) throw new TypeError(`不支持的 domain: ${input.domain || "缺失"}`);
  return protocol.decode(input);
}

function decodeBatch(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) throw new TypeError("批量输入不能为空");
  const results = inputs.map((input, index) => {
    try { return { index, ok: true, result: decodeObject(input) }; }
    catch (error) { return { index, ok: false, error: error.message }; }
  });
  const valid = results.filter(item => item.ok).map(item => item.result);
  return {
    schemaVersion: 1,
    results,
    summary: {
      total: results.length,
      accepted: valid.filter(result => result.residual === 0).length,
      counterexamplesOrFailures: valid.filter(result => result.residual > 0).length,
      uncertain: valid.filter(result => result.status === "uncertain" || result.verification === "no_certificate").length,
      inputErrors: results.filter(item => !item.ok).length,
      domains: [...new Set(valid.map(result => result.domain))],
    },
  };
}

async function runCli() {
  let text = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) text += chunk;
  const parsed = JSON.parse(text);
  const output = Array.isArray(parsed) ? decodeBatch(parsed) : decodeObject(parsed);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

module.exports = { decodeObject, decodeBatch, runCli };
if (require.main === module) runCli().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
